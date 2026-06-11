'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { resolveIcon, presetNames } = require('../src/icons');
const { applyPersona, validThemes } = require('../src/personas');
const { shouldSend } = require('../src/policy');

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
