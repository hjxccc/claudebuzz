#!/usr/bin/env node
'use strict';
// ClaudeBuzz 终端 CLI：配置 Bark(主)/飞书/PushDeer、发测试、切 persona/图标、开关通知类型、体检。
// /notify-setup slash 命令底层也调它。

const { loadConfig, saveConfig, CONFIG_FILE } = require('../src/config');
const { buildMessage } = require('../src/message');
const { validThemes, THEME_NAMES } = require('../src/personas');
const { presetNames } = require('../src/icons');
const channels = require('../src/channels');

function maskKey(k) {
  if (!k) return '(未设置)';
  if (k.length <= 8) return '*'.repeat(k.length);
  return k.slice(0, 4) + '*'.repeat(k.length - 8) + k.slice(-4);
}

// 通知类型名 → config.notify 字段
const NOTIFY_MAP = {
  permission: 'onPermission',
  done: 'onTaskDone',
  attention: 'onAttention',
  danger: 'onDanger',
  failure: 'onFailure',
};

// 解析 Bark 输入：完整 URL 或裸 key。
function parseBark(value) {
  value = String(value || '').trim();
  if (!value) throw new Error('输入为空');
  if (/^https?:\/\//i.test(value)) {
    const u = new URL(value);
    const seg = u.pathname.split('/').filter(Boolean);
    if (!seg.length || seg[0].length < 8) throw new Error('URL 里解析不到有效的 Bark key');
    return { server: `${u.protocol}//${u.host}`, key: seg[0] };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length < 8) {
    throw new Error('既不像 Bark URL 也不像 key，请粘贴 App 里的完整地址');
  }
  return { server: null, key: value };
}

// 解析 PushDeer 输入：裸 pushkey，或含 pushkey= 的完整 URL。
function parsePushdeer(value) {
  value = String(value || '').trim();
  if (!value) throw new Error('输入为空');
  if (/^https?:\/\//i.test(value)) {
    const u = new URL(value);
    const k = u.searchParams.get('pushkey');
    if (!k) throw new Error('URL 里没有 pushkey 参数');
    return { server: `${u.protocol}//${u.host}`, key: k };
  }
  return { server: null, key: value };
}

function upsertChannel(cfg, type, props) {
  cfg.channels = cfg.channels || [];
  let ch = cfg.channels.find((c) => c.type === type);
  if (!ch) { ch = { type }; cfg.channels.push(ch); }
  Object.assign(ch, props);
  return ch;
}

function cmdConfigBark(arg) {
  const cfg = loadConfig();
  const { server, key } = parseBark(arg);
  const ch = upsertChannel(cfg, 'bark', server ? { key, server } : { key });
  if (!ch.server) ch.server = 'https://api.day.app';
  if (!ch.icon) ch.icon = 'robot-pink';
  saveConfig(cfg);
  console.log(`✅ Bark 已配置：${maskKey(key)} @ ${ch.server}`);
  console.log(`   运行 'claudebuzz test' 验证。`);
}

function cmdConfigFeishu(webhook, secret) {
  const cfg = loadConfig();
  webhook = String(webhook || '').trim();
  if (!/^https?:\/\//i.test(webhook)) throw new Error('请粘贴飞书机器人的完整 Webhook 地址（https://open.feishu.cn/...）');
  const props = { webhook };
  if (secret) props.secret = secret; // 启用了“签名校验”时传第二个参数
  upsertChannel(cfg, 'feishu', props);
  saveConfig(cfg);
  console.log(`✅ 飞书已配置：${webhook.slice(0, 48)}...`);
  if (!secret) console.log('   提示：若机器人开了“签名校验”，请：claudebuzz config feishu <webhook> <secret>');
  console.log(`   运行 'claudebuzz test' 验证。`);
}

function cmdConfigPushdeer(arg) {
  const cfg = loadConfig();
  const { server, key } = parsePushdeer(arg);
  const ch = upsertChannel(cfg, 'pushdeer', server ? { key, server } : { key });
  if (!ch.server) ch.server = 'https://api2.pushdeer.com';
  saveConfig(cfg);
  console.log(`✅ PushDeer 已配置：${maskKey(key)} @ ${ch.server}`);
  console.log(`   运行 'claudebuzz test' 验证。`);
}

async function cmdTest(kind) {
  const cfg = loadConfig();
  const danger = kind === 'danger';
  const msg = buildMessage('permission_required', {
    detail: danger ? 'Bash: rm -rf /tmp/build  （危险测试）' : 'Bash: npm install  （测试）',
    persona: cfg.persona,
    detailMaxLen: cfg.detailMaxLen,
    isDanger: danger,
    sounds: cfg.sounds,
    dangerCue: cfg.danger,
  });
  const cueInfo = msg.cue.danger ? ` [🚨升级 level=${msg.cue.level} call=on sound=${msg.cue.sound}]`
    : msg.cue.sound ? ` [sound=${msg.cue.sound}]` : '';
  console.log(`发送测试：${msg.title} / ${msg.body}${cueInfo}`);
  if (!cfg.channels || !cfg.channels.length) return console.log('⚠️ 未配置任何渠道');
  const results = await channels.dispatch(cfg.channels, msg);
  for (const r of results) console.log(`  [${r.type}] ${r.ok ? '✅ 成功' : '❌ ' + r.info}`);
}

function cmdPersona(name) {
  const cfg = loadConfig();
  if (!name) {
    console.log(`当前 persona：${cfg.persona}（${THEME_NAMES[cfg.persona] || cfg.persona}）`);
    console.log(`可选：${validThemes().map((t) => `${t}(${THEME_NAMES[t]})`).join(' / ')}`);
    return;
  }
  if (!validThemes().includes(name)) {
    console.error(`❌ 未知 persona：${name}。可选：${validThemes().join(', ')}`);
    process.exit(1);
  }
  cfg.persona = name;
  saveConfig(cfg);
  console.log(`✅ persona 已切换为：${name}（${THEME_NAMES[name]}）`);
}

function cmdIcon(value) {
  const cfg = loadConfig();
  if (!value) {
    const cur = (cfg.channels[0] || {}).icon || '(无)';
    console.log(`当前图标：${cur}`);
    console.log(`预设：${presetNames().join(' / ')}（也可填完整图片 URL）`);
    return;
  }
  (cfg.channels || []).forEach((c) => { c.icon = value; });
  saveConfig(cfg);
  console.log(`✅ 图标已设为：${value}（对全部渠道生效）`);
}

function cmdNotify(type, state) {
  const cfg = loadConfig();
  if (!type) {
    console.log('当前通知类型开关：');
    for (const [k, field] of Object.entries(NOTIFY_MAP)) {
      console.log(`  ${k.padEnd(11)} ${cfg.notify[field] ? '✅ 开' : '🔇 关'}`);
    }
    console.log('用法：claudebuzz notify <permission|done|attention|danger|failure> <on|off>');
    return;
  }
  const field = NOTIFY_MAP[type];
  if (!field) { console.error(`❌ 未知类型：${type}。可选：${Object.keys(NOTIFY_MAP).join('/')}`); process.exit(1); }
  if (state !== 'on' && state !== 'off') { console.error('❌ 状态只能是 on / off'); process.exit(1); }
  cfg.notify[field] = state === 'on';
  saveConfig(cfg);
  console.log(`✅ ${type} 通知已${state === 'on' ? '开启' : '关闭'}`);
}

function channelLabel(ch) {
  if (ch.type === 'bark') return `bark   key=${ch.key ? maskKey(ch.key) : '⚠️未设置'} @ ${ch.server}`;
  if (ch.type === 'pushdeer') return `pushdeer key=${ch.key ? maskKey(ch.key) : '⚠️未设置'} @ ${ch.server || 'https://api2.pushdeer.com'}`;
  if (ch.type === 'feishu') return `feishu webhook=${ch.webhook ? ch.webhook.slice(0, 40) + '…' : '⚠️未设置'}${ch.secret ? ' (签名)' : ''}`;
  return `${ch.type}`;
}
function channelReady(ch) {
  if (ch.type === 'bark') return !!ch.key;
  if (ch.type === 'pushdeer') return !!ch.key;
  if (ch.type === 'feishu') return !!ch.webhook;
  return false;
}

async function cmdDoctor() {
  const cfg = loadConfig();
  const list = cfg.channels || [];
  console.log('\n  ClaudeBuzz Doctor');
  console.log(`  配置文件 : ${CONFIG_FILE}`);
  console.log(`  Node     : ${process.version}`);
  console.log(`  persona  : ${cfg.persona}（${THEME_NAMES[cfg.persona] || cfg.persona}）`);
  const on = Object.entries(NOTIFY_MAP).filter(([, f]) => cfg.notify[f]).map(([k]) => k);
  console.log(`  推送类型 : ${on.length ? on.join(', ') : '(全关)'}`);
  if (!list.length) console.log('  渠道     : ⚠️ 未配置任何渠道');
  for (const ch of list) {
    console.log(`  渠道     : ${channelLabel(ch)}`);
    if (channelReady(ch)) {
      process.stdout.write('  连通测试 : ');
      const [r] = await channels.dispatch([ch], buildMessage('info', { detail: 'ClaudeBuzz doctor 自检', persona: 'off' }));
      console.log(r.ok ? `✅ ${ch.type} 可达` : `❌ ${r.info}`);
    }
  }
  console.log('');
}

function usage() {
  console.log(`ClaudeBuzz CLI
  claudebuzz config bark <Bark URL 或 key>     配置 Bark（iPhone / Apple Watch，主打）
  claudebuzz config feishu <webhook> [secret]  配置飞书机器人（安卓兜底）
  claudebuzz config pushdeer <pushkey>         配置 PushDeer（开源 Bark 替代，可选）
  claudebuzz test [danger]                     发送测试推送（danger=危险命令升级演示）
  claudebuzz persona [主题]                    查看/切换话术
  claudebuzz icon [预设名或URL]                查看/切换图标（${presetNames().join('/')}）
  claudebuzz notify [类型] [on|off]            查看/开关通知类型
  claudebuzz doctor                            健康检查
`);
}

async function main() {
  const [cmd, a, b, ...rest] = process.argv.slice(2);
  try {
    if (cmd === 'config' && a === 'bark') cmdConfigBark(b);
    else if (cmd === 'config' && a === 'pushdeer') cmdConfigPushdeer(b);
    else if (cmd === 'config' && a === 'feishu') cmdConfigFeishu(b, rest[0]);
    else if (cmd === 'test') await cmdTest(a);
    else if (cmd === 'persona') cmdPersona(a);
    else if (cmd === 'icon') cmdIcon(a);
    else if (cmd === 'notify') cmdNotify(a, b);
    else if (cmd === 'doctor') await cmdDoctor();
    else usage();
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exit(1);
  }
}

main();
