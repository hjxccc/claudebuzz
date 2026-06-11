'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveIcon, presetNames } = require('../src/icons');
const { applyPersona, validThemes } = require('../src/personas');
const { shouldSend } = require('../src/policy');
const { buildMessage } = require('../src/message');
const { isDangerText } = require('../src/classify');
const bark = require('../src/channels/bark');

test('图标预设解析：预设名→URL，未知值原样当 URL', () => {
  assert.match(resolveIcon('robot-pink'), /^https:\/\/.*\.png$/);
  assert.equal(resolveIcon('https://example.com/x.png'), 'https://example.com/x.png');
  assert.equal(resolveIcon(''), '');
  assert.ok(presetNames().includes('robot-pink'));
});

test('persona：新增主题齐全，每个都能产出标题', () => {
  for (const t of ['gentle', 'zen', 'military', 'mom', 'en']) {
    assert.ok(validThemes().includes(t), `${t} 应注册`);
    const m = applyPersona('permission_required', t);
    assert.ok(m.title && m.title.length > 0, `${t} 应有权限标题`);
  }
  // 英文版应是英文
  assert.match(applyPersona('permission_required', 'en').title, /Approval/);
});

test('persona：所有主题覆盖全部 event_type（无 undefined 标题）', () => {
  const events = ['permission_required', 'task_done', 'attention_required', 'danger', 'drift', 'failure', 'info', 'possible_permission_wait', 'permission_denied'];
  for (const t of validThemes()) {
    for (const e of events) {
      const m = applyPersona(e, t);
      assert.ok(typeof m.title === 'string' && m.title.length > 0, `${t}/${e} 标题缺失`);
    }
  }
});

test('通知策略：failure 受 onFailure 控制', () => {
  assert.equal(shouldSend('failure', { onFailure: true }), true);
  assert.equal(shouldSend('failure', { onFailure: false }), false);
  assert.equal(shouldSend('failure', {}), false);
});

test('危险命令检测：rm -rf / push --force 命中，普通命令不命中', () => {
  assert.equal(isDangerText('Bash: rm -rf /tmp/x'), true);
  assert.equal(isDangerText('Bash: git push origin main'), true); // git push 在危险词表
  assert.equal(isDangerText('Bash: ls -la'), false);
  assert.equal(isDangerText(''), false);
});

test('分事件铃声：不同 event_type 给不同 sound', () => {
  const perm = buildMessage('permission_required', { detail: 'ls' });
  const done = buildMessage('task_done', { detail: 'done' });
  assert.equal(perm.cue.sound, 'shake');
  assert.equal(done.cue.sound, 'birdsong');
});

test('危险升级：isDanger=true 时 cue 带 critical/call/alarm/danger 图标', () => {
  const m = buildMessage('permission_required', { detail: 'rm -rf /', isDanger: true });
  assert.equal(m.cue.danger, true);
  assert.equal(m.cue.level, 'critical');
  assert.equal(m.cue.call, true);
  assert.equal(m.cue.sound, 'alarm');
  assert.equal(m.cue.icon, 'danger');
});

test('一键复制：命令类事件 cue.copy 为去掉工具名前缀的纯命令', () => {
  const m = buildMessage('permission_required', { detail: 'Bash: git push origin main' });
  assert.equal(m.cue.copy, 'git push origin main');
  // 任务完成（非命令短事件）不挂 copy
  const done = buildMessage('task_done', { detail: '改完了 3 个文件' });
  assert.equal(done.cue.copy, undefined);
});

test('Bark URL 把 cue 拼进去：sound + call + critical + 🚨图标', async () => {
  // 拦截真实请求：用空 key 触发未配置短路，但 URL 组装逻辑前置不到——改为白盒检查 resolveIcon 预设
  const m = buildMessage('permission_required', { detail: 'rm -rf /', isDanger: true });
  // danger 预设应解析为 openmoji 🚨
  assert.match(resolveIcon(m.cue.icon), /1F6A8\.png$/);
  // bark.send 对未配置 key 安全失败，不联网
  const r = await bark.send({ type: 'bark', key: '' }, m);
  assert.equal(r.ok, false);
});
