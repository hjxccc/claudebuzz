'use strict';
// Bark 推送渠道（iOS / Apple Watch）。零依赖，用 Node 内置 https。
// 移植自 agentwatch/notifier.py send_bark。
const https = require('https');
const http = require('http');
const { resolveIcon } = require('../icons');

function enc(s) { return encodeURIComponent(String(s == null ? '' : s)); }

// ch: { key, server, icon, group, level }
// 返回 Promise<{ ok:boolean, info:string }>
function send(ch, msg) {
  return new Promise((resolve) => {
    const key = (ch && ch.key) || '';
    if (!key || key === 'YOUR_BARK_KEY') {
      return resolve({ ok: false, info: 'bark key 未配置' });
    }
    const server = (ch.server || 'https://api.day.app').replace(/\/+$/, '');
    const group = ch.group || 'ClaudeCode';
    const cue = msg.cue || {};
    // 危险命令升级：cue.level=critical 突破勿扰/静音；否则用渠道默认 timeSensitive。
    const level = cue.level || ch.level || 'timeSensitive';
    let url = `${server}/${key}/${enc(msg.title)}/${enc(msg.body)}?group=${enc(group)}&level=${enc(level)}`;
    // 图标：危险事件用 cue.icon（🚨）覆盖渠道默认图标。
    const icon = resolveIcon(cue.icon || ch.icon);
    if (icon) url += `&icon=${enc(icon)}`;
    if (cue.sound) url += `&sound=${enc(cue.sound)}`; // 分事件铃声
    if (cue.call) url += '&call=1'; // 危险：重复响铃直到查看
    if (cue.copy) url += `&copy=${enc(cue.copy)}`; // 一键复制：长按通知复制完整命令

    const lib = url.startsWith('http://') ? http : https;
    try {
      const req = lib.get(url, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('error', (e) => resolve({ ok: false, info: e.message })); // 响应阶段 socket 错误，避免 Promise 永挂
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let ok = res.statusCode === 200;
          try { ok = JSON.parse(data).code === 200; } catch (_) {}
          resolve({ ok, info: `HTTP ${res.statusCode}` });
        });
      });
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, info: '超时' }); });
      req.on('error', (e) => resolve({ ok: false, info: e.message }));
    } catch (e) {
      resolve({ ok: false, info: e.message });
    }
  });
}

module.exports = { send };
