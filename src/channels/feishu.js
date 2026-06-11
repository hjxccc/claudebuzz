'use strict';
// 飞书自定义机器人 webhook 渠道。国产手机最稳（飞书 App 常驻不被杀）。
// 文档：群设置 → 群机器人 → 添加自定义机器人 → 复制 Webhook 地址。
// 安全设置支持：签名校验(secret) / 自定义关键词(keyword)。
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// 飞书签名：base64( HMAC-SHA256( key = `${timestamp}\n${secret}`, data = '' ) )
function genSign(secret, timestamp) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac('sha256', stringToSign).update('').digest('base64');
}

// ch: { webhook, secret?, keyword? }
function send(ch, msg) {
  return new Promise((resolve) => {
    const webhook = (ch && ch.webhook) || '';
    if (!webhook) return resolve({ ok: false, info: 'feishu webhook 未配置' });

    let text = msg.body ? `${msg.title}\n${msg.body}` : msg.title;
    // 若机器人设了“自定义关键词”安全策略，消息里必须含该词，否则被拒。
    if (ch.keyword && !text.includes(ch.keyword)) text = `${ch.keyword} ${text}`;

    const payload = { msg_type: 'text', content: { text } };
    if (ch.secret) {
      const ts = Math.floor(Date.now() / 1000).toString();
      payload.timestamp = ts;
      payload.sign = genSign(ch.secret, ts);
    }
    const body = JSON.stringify(payload);

    let u;
    try { u = new URL(webhook); } catch (e) { return resolve({ ok: false, info: 'webhook 不是合法 URL' }); }
    const lib = u.protocol === 'http:' ? http : https;
    try {
      const req = lib.request(
        { method: 'POST', hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search,
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 10000 },
        (res) => {
          let data = '';
          res.on('error', (e) => resolve({ ok: false, info: e.message }));
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            let ok = res.statusCode === 200;
            try { const j = JSON.parse(data); ok = j.code === 0 || j.StatusCode === 0; if (!ok && j.msg) return resolve({ ok: false, info: j.msg }); } catch (_) {}
            resolve({ ok, info: `HTTP ${res.statusCode}` });
          });
        }
      );
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, info: '超时' }); });
      req.on('error', (e) => resolve({ ok: false, info: e.message }));
      req.write(body);
      req.end();
    } catch (e) {
      resolve({ ok: false, info: e.message });
    }
  });
}

module.exports = { send };
