'use strict';
// 组装通知：标题承载 persona 语气；正文优先用“真实详情”，无详情才退回 persona 兜底句。
const { applyPersona } = require('./personas');

const SKIP_DETAIL = new Set(['', 'unknown', 'tool', 'none']);
const SHORT_EVENTS = new Set([
  'permission_required', 'possible_permission_wait', 'danger', 'drift',
  'attention_required', 'permission_denied',
]);

function buildMessage(eventType, opts) {
  opts = opts || {};
  const persona = opts.persona || 'off';
  const defaultMax = opts.detailMaxLen || 45;
  const { title, body: fallbackBody } = applyPersona(eventType, persona);

  let detail = String(opts.detail || '').replace(/\s+/g, ' ').trim();
  if (SKIP_DETAIL.has(detail.toLowerCase())) detail = '';

  let body;
  if (detail) {
    const limit = SHORT_EVENTS.has(eventType) ? defaultMax : Math.max(defaultMax, 100);
    if (detail.length > limit) detail = detail.slice(0, limit) + '…';
    body = `📋 ${detail}`; // 详情即正文，一眼看清要允许/已完成的内容
  } else {
    body = fallbackBody;
  }
  return { title, body };
}

module.exports = { buildMessage };
