'use strict';
// 用采自真实 Claude Code 日志的 payload 夹具，验证分类/详情/消息/策略/去重。
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { processEvent } = require('../src/hook');
const { DEFAULTS } = require('../src/config');
const { isDuplicate } = require('../src/store');

const FX = path.join(__dirname, 'fixtures');
const load = (f) => JSON.parse(fs.readFileSync(path.join(FX, f), 'utf8'));
const cfg = JSON.parse(JSON.stringify(DEFAULTS)); // persona=coolie, 只推 permission

test('Stop → task_done，详情取自 last_assistant_message，正文以 📋 开头', () => {
  const r = processEvent('Stop', load('stop.json'), cfg);
  assert.equal(r.eventType, 'task_done');
  assert.ok(r.detail.length > 0, '应有任务摘要详情');
  assert.match(r.msg.body, /^📋 /);
  assert.equal(r.willSend, false, '默认不推任务完成');
});

test('Notification(permission) → permission_required，默认推送，标题为牛马版', () => {
  // 用临时 transcript（含一个 tool_use）保证测试自洽、可跨机运行。
  const os = require('os');
  const tpath = path.join(os.tmpdir(), `cb-transcript-${process.pid}.jsonl`);
  fs.writeFileSync(
    tpath,
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'git push origin main' } }] } }) + '\n',
    'utf8'
  );
  const payload = { hook_event_name: 'Notification', message: 'Claude needs your permission', notification_type: 'permission', session_id: 's1', transcript_path: tpath };
  const r = processEvent('Notification', payload, cfg);
  fs.unlinkSync(tpath);
  assert.equal(r.eventType, 'permission_required');
  assert.equal(r.willSend, true);
  assert.equal(r.msg.title, '喂！牛马！过来允许一下');
  assert.match(r.msg.body, /git push origin main/);
});

test('Notification(waiting input) → attention_required，默认静默', () => {
  const r = processEvent('Notification', load('notification_waiting.json'), cfg);
  assert.equal(r.eventType, 'attention_required');
  assert.equal(r.willSend, false);
});

test('空 PermissionRequest 不应出现 “Unknown”', () => {
  const r = processEvent('PermissionRequest', {}, cfg);
  assert.equal(r.eventType, 'permission_required');
  assert.ok(!/unknown/i.test(r.msg.body), '不应有 Unknown');
});

test('详情超长会被截断到 detailMaxLen', () => {
  const longCmd = 'Bash: ' + 'x'.repeat(200);
  const r = processEvent('PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'x'.repeat(200) } }, cfg);
  // 📋 + 截断 + …
  assert.ok(r.msg.body.length <= cfg.detailMaxLen + 6);
  assert.match(r.msg.body, /…$/);
});

test('全局总开关：enabled=false 时即使是 permission 也不推', () => {
  const off = Object.assign({}, cfg, { enabled: false });
  const r = processEvent('PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'ls' } }, off, 600);
  assert.equal(r.enabled, false);
  assert.equal(r.willSend, false, '全局静音时不推');
});

test('勿扰时段：跨夜 23:00–08:00，凌晨 2 点静默、上午 10 点恢复', () => {
  const quiet = Object.assign({}, cfg, { quietHours: { enabled: true, start: '23:00', end: '08:00' } });
  const payload = { tool_name: 'Bash', tool_input: { command: 'ls' } };
  const at2am = processEvent('PermissionRequest', payload, quiet, 2 * 60);   // 02:00
  const at10am = processEvent('PermissionRequest', payload, quiet, 10 * 60); // 10:00
  assert.equal(at2am.quiet, true);
  assert.equal(at2am.willSend, false, '勿扰时段内不推');
  assert.equal(at10am.quiet, false);
  assert.equal(at10am.willSend, true, '过点自动恢复推送');
});

test('勿扰时段未开启时不影响推送', () => {
  const r = processEvent('PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'ls' } }, cfg, 2 * 60);
  assert.equal(r.quiet, false);
  assert.equal(r.willSend, true);
});

test('去重：同 key 在窗口内第二次判定为重复', () => {
  // 唯一 key + 唯一时间基准，避免持久化 state 在多次运行间互相污染。
  const now = Date.now();
  const key = `permission_required|sess-${process.pid}-${now}|Bash: demo`;
  const first = isDuplicate(key, 8000, now);
  const second = isDuplicate(key, 8000, now + 1000);
  const third = isDuplicate(key, 8000, now + 9000); // 超出窗口 → 不算重复
  assert.equal(first, false, '首次不应判重');
  assert.equal(second, true, '窗口内第二次应判重');
  assert.equal(third, false, '超出窗口应放行');
});
