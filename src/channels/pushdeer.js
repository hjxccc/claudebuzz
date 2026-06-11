'use strict';
// PushDeer 推送渠道（开源 Bark 替代，iOS/安卓/桌面/自托管）。零依赖。
// API: https://api2.pushdeer.com/message/push?pushkey=KEY&text=...&type=text
const https = require('https');
const http = require('http');

function enc(s) { return encodeURIComponent(String(s == null ? '' : s)); }

// ch: { key, server }
function send(ch, msg) {
  return new Promise((resolve) => {
    const key = (ch && ch.key) || '';
    if (!key) return resolve({ ok: false, info: 'pushdeer key 未配置' });
    const server = (ch.server || 'https://api2.pushdeer.com').replace(/\/+$/, '');
    // 标题+正文合并进 text，用纯文本类型，避免 markdown 干扰命令片段。
    const text = msg.body ? `${msg.title}\n${msg.body}` : msg.title;
    const url = `${server}/message/push?pushkey=${enc(key)}&type=text&text=${enc(text)}`;
    const lib = url.startsWith('http://') ? http : https;
    try {
      const req = lib.get(url, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('error', (e) => resolve({ ok: false, info: e.message }));
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let ok = res.statusCode === 200;
          try { ok = JSON.parse(data).code === 0; } catch (_) {}
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
