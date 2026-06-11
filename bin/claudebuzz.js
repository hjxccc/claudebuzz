#!/usr/bin/env node
'use strict';
// ClaudeBuzz 终端 CLI：配置 Bark/ntfy、发测试、切 persona/图标、开关通知类型、体检。
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

// 解析 ntfy 输入：完整 URL（https://ntfy.sh/topic）或裸 topic。
function parseNtfy(value) {
  value = String(value || '').trim();
  if (!value) throw new Error('输入为空');
  if (/^https?:\/\//i.test(value)) {
    const u = new URL(value);
    const seg = u.pathname.split('/').filter(Boolean);
    if (!seg.length) throw new Error('URL 里解析不到 topic');
    return { server: `${u.protocol}//${u.host}`, topic: seg[0] };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('topic 只能含字母数字和 _-');
  return { server: null, topic: value };
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

function cmdConfigNtfy(arg) {
  const cfg = loadConfig();
  const { server, topic } = parseNtfy(arg);
  const ch = upsertChannel(cfg, 'ntfy', server ? { topic, server } : { topic });
  if (!ch.server) ch.server = 'https://ntfy.sh';
  if (!ch.priority) ch.priority = 4;
  if (!ch.icon) ch.icon = 'robot-pink';
  saveConfig(cfg);
  console.log(`✅ ntfy 已配置：topic=${topic} @ ${ch.server}`);
  console.log(`   手机 ntfy App 订阅该 topic，然后运行 'claudebuzz test' 验证。`);
}

async function cmdTest() {
  const cfg = loadConfig();
  const msg = buildMessage('permission_required', {
    detail: 'Bash: git push origin main  （测试）',
    persona: cfg.persona,
    detailMaxLen: cfg.detailMaxLen,
  });
  console.log(`发送测试：${msg.title} / ${msg.body}`);
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
  if (ch.type === 'ntfy') return `ntfy   topic=${ch.topic || '⚠️未设置'} @ ${ch.server || 'https://ntfy.sh'}`;
  return `${ch.type}`;
}
function channelReady(ch) {
  if (ch.type === 'bark') return !!ch.key;
  if (ch.type === 'ntfy') return !!ch.topic;
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
  claudebuzz config bark <Bark URL 或 key>     配置 Bark（iPhone）
  claudebuzz config ntfy <topic 或 ntfy URL>   配置 ntfy（安卓/跨平台）
  claudebuzz test                              发送测试推送
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
    else if (cmd === 'config' && a === 'ntfy') cmdConfigNtfy(b);
    else if (cmd === 'test') await cmdTest();
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
