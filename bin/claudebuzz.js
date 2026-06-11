#!/usr/bin/env node
'use strict';
// ClaudeBuzz 终端 CLI：配置 Bark、发测试、切 persona、体检。
// 给不想用 /notify-setup slash 命令的人；slash 命令底层也调它。

const { loadConfig, saveConfig, CONFIG_FILE } = require('../src/config');
const { buildMessage } = require('../src/message');
const { validThemes, THEME_NAMES } = require('../src/personas');
const channels = require('../src/channels');

function maskKey(k) {
  if (!k) return '(未设置)';
  if (k.length <= 8) return '*'.repeat(k.length);
  return k.slice(0, 4) + '*'.repeat(k.length - 8) + k.slice(-4);
}

// 解析 Bark 输入：完整 URL（https://api.day.app/KEY/...）或裸 key。
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

function firstBark(cfg) {
  return (cfg.channels || []).find((c) => c.type === 'bark') || null;
}

async function cmdConfigBark(arg) {
  const cfg = loadConfig();
  const { server, key } = parseBark(arg);
  let ch = firstBark(cfg);
  if (!ch) { ch = { type: 'bark', server: 'https://api.day.app' }; cfg.channels.unshift(ch); }
  ch.key = key;
  if (server) ch.server = server;
  saveConfig(cfg);
  console.log(`✅ Bark key 已保存：${maskKey(key)}`);
  console.log(`   服务器：${ch.server}`);
  console.log(`   运行 'claudebuzz test' 发测试推送验证。`);
}

async function cmdTest() {
  const cfg = loadConfig();
  const msg = buildMessage('permission_required', {
    detail: 'Bash: git push origin main  （这是一条测试）',
    persona: cfg.persona,
    detailMaxLen: cfg.detailMaxLen,
  });
  console.log(`发送测试：${msg.title} / ${msg.body}`);
  const results = await channels.dispatch(cfg.channels, msg);
  for (const r of results) console.log(`  [${r.type}] ${r.ok ? '✅ 成功' : '❌ ' + r.info}`);
}

function cmdPersona(name) {
  const cfg = loadConfig();
  if (!name) {
    console.log(`当前 persona：${cfg.persona}（${THEME_NAMES[cfg.persona] || cfg.persona}）`);
    console.log(`可选：${validThemes().join(', ')}`);
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
  console.log(`  persona  : ${cfg.persona}`);
  console.log(`  推送策略 : permission=${cfg.notify.onPermission} done=${cfg.notify.onTaskDone} attention=${cfg.notify.onAttention}`);
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
  claudebuzz config bark <Bark URL 或 key>   配置 Bark
  claudebuzz test                            发送测试推送
  claudebuzz persona [主题]                  查看/切换话术（${validThemes().join('/')}）
  claudebuzz doctor                          健康检查
`);
}

async function main() {
  const [cmd, sub, ...rest] = process.argv.slice(2);
  try {
    if (cmd === 'config' && sub === 'bark') await cmdConfigBark(rest[0]);
    else if (cmd === 'test') await cmdTest();
    else if (cmd === 'persona') cmdPersona(sub);
    else if (cmd === 'doctor') await cmdDoctor();
    else usage();
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exit(1);
  }
}

main();
