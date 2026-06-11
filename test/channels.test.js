'use strict';
const test = require('node:test');
const assert = require('node:assert');
const channels = require('../src/channels');
const ntfy = require('../src/channels/ntfy');
const bark = require('../src/channels/bark');

test('渠道注册表含 bark 与 ntfy', () => {
  assert.ok(channels.REGISTRY.bark, 'bark 应注册');
  assert.ok(channels.REGISTRY.ntfy, 'ntfy 应注册');
});

test('未配置时不联网、安全返回失败', async () => {
  const r1 = await bark.send({ type: 'bark', key: '' }, { title: 't', body: 'b' });
  const r2 = await ntfy.send({ type: 'ntfy', topic: '' }, { title: 't', body: 'b' });
  assert.equal(r1.ok, false);
  assert.equal(r2.ok, false);
});

test('dispatch 对未知渠道优雅降级，不抛错', async () => {
  const res = await channels.dispatch([{ type: 'nope' }], { title: 't', body: 'b' });
  assert.equal(res.length, 1);
  assert.equal(res[0].ok, false);
  assert.match(res[0].info, /未知渠道/);
});
