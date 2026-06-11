'use strict';
// ntfy 推送渠道（开源、跨平台，安卓的 Bark 替代）。用 JSON 发布 API 以正确支持中文/emoji。
// 文档：https://docs.ntfy.sh/publish/#publish-as-json
const https = require('https');
const http = require('http');
const { resolveIcon } = require('../icons');

// ch: { topic, server, icon, priority, token? }
function send(ch, msg) {
  return new Promise((resolve) => {
    const topic = (ch && ch.topic) || '';
    if (!topic) return resolve({ ok: false, info: 'ntfy topic 未配置' });
    const server = (ch.server || 'https://ntfy.sh').replace(/\/+$/, '');
    const icon = resolveIcon(ch.icon);
    const payload = JSON.stringify({
      topic,
      title: msg.title,
      message: msg.body,
      priority: ch.priority || 4,
      ...(icon ? { icon } : {}),
    });
    const lib = server.startsWith('http://') ? http : https;
    try {
      const u = new URL(server + '/');
      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      };
      if (ch.token) headers.Authorization = `Bearer ${ch.token}`; // 自托管/受保护 topic
      const req = lib.request(
        { method: 'POST', hostname: u.hostname, port: u.port || undefined, path: u.pathname, headers, timeout: 10000 },
        (res) => {
          let data = '';
          res.on('error', (e) => resolve({ ok: false, info: e.message }));
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, info: `HTTP ${res.statusCode}` }));
        }
      );
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, info: '超时' }); });
      req.on('error', (e) => resolve({ ok: false, info: e.message }));
      req.write(payload);
      req.end();
    } catch (e) {
      resolve({ ok: false, info: e.message });
    }
  });
}

module.exports = { send };
