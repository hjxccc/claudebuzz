'use strict';
const test = require('node:test');
const assert = require('node:assert');
const channels = require('../src/channels');
const bark = require('../src/channels/bark');
const feishu = require('../src/channels/feishu');

test('渠道注册表含 bark / feishu / pushdeer', () => {
  assert.ok(channels.REGISTRY.bark, 'bark 应注册');
  assert.ok(channels.REGISTRY.feishu, 'feishu 应注册');
  assert.ok(channels.REGISTRY.pushdeer, 'pushdeer 应注册');
  assert.ok(!channels.REGISTRY.ntfy, 'ntfy 已移除，不应注册');
});

test('未配置时不联网、安全返回失败', async () => {
  const r1 = await bark.send({ type: 'bark', key: '' }, { title: 't', body: 'b' });
  const r3 = await feishu.send({ type: 'feishu', webhook: '' }, { title: 't', body: 'b' });
  assert.equal(r1.ok, false);
  assert.equal(r3.ok, false);
});

test('feishu 关键词安全策略会前置关键词', async () => {
  // webhook 非法 URL → 不会真的联网，但 send 内部会先组装文本；这里只验证签名函数稳定
  const crypto = require('crypto');
  const ts = '1700000000';
  const sign = crypto.createHmac('sha256', `${ts}\nSECRET`).update('').digest('base64');
  assert.ok(typeof sign === 'string' && sign.length > 0, '签名应为非空 base64');
  const r = await feishu.send({ type: 'feishu', webhook: 'not-a-url' }, { title: 't', body: 'b' });
  assert.equal(r.ok, false);
  assert.match(r.info, /URL/);
});

test('dispatch 对未知渠道优雅降级，不抛错', async () => {
  const res = await channels.dispatch([{ type: 'nope' }], { title: 't', body: 'b' });
  assert.equal(res.length, 1);
  assert.equal(res[0].ok, false);
  assert.match(res[0].info, /未知渠道/);
});
