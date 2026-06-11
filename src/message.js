'use strict';
// 组装通知：标题承载 persona 语气；正文优先用“真实详情”，无详情才退回 persona 兜底句。
const { applyPersona } = require('./personas');

const SKIP_DETAIL = new Set(['', 'unknown', 'tool', 'none']);
const SHORT_EVENTS = new Set([
  'permission_required', 'possible_permission_wait', 'danger', 'drift',
  'attention_required', 'permission_denied',
]);

// 分事件默认铃声（Bark sound 参数；其它渠道忽略）。一耳朵分清是哪类事件。
const DEFAULT_SOUNDS = {
  permission_required: 'shake',
  attention_required: 'bell',
  task_done: 'birdsong',
  failure: 'minuet',
  permission_denied: 'shake',
  danger: 'alarm',
};

// 组装“提示线索”cue：铃声 + 危险升级（critical 突破静音 / 重复响铃 / 🚨 图标）。
// 仅 Bark 消费 cue；feishu/pushdeer 安全忽略未知字段。
function buildCue(eventType, isDanger, opts) {
  const sounds = Object.assign({}, DEFAULT_SOUNDS, opts.sounds || {});
  const cue = {};
  const sound = isDanger ? (sounds.danger || 'alarm') : sounds[eventType];
  if (sound) cue.sound = sound;
  if (isDanger) {
    const d = (opts.dangerCue && typeof opts.dangerCue === 'object') ? opts.dangerCue : {};
    cue.danger = true;
    cue.level = d.level || 'critical'; // 突破勿扰/静音强制提醒
    cue.call = d.call !== false;       // 默认重复响铃直到查看
    cue.icon = d.icon || 'danger';     // 🚨 危险专属图标（覆盖默认）
  }
  return cue;
}

function buildMessage(eventType, opts) {
  opts = opts || {};
  const persona = opts.persona || 'off';
  const defaultMax = opts.detailMaxLen || 45;
  const isDanger = !!opts.isDanger || eventType === 'danger';
  const { title, body: fallbackBody } = applyPersona(eventType, persona);

  let detail = String(opts.detail || '').replace(/\s+/g, ' ').trim();
  if (SKIP_DETAIL.has(detail.toLowerCase())) detail = '';
  const rawDetail = detail; // 未截断的完整命令，供“一键复制”用

  let body;
  if (detail) {
    const limit = SHORT_EVENTS.has(eventType) ? defaultMax : Math.max(defaultMax, 100);
    if (detail.length > limit) detail = detail.slice(0, limit) + '…';
    body = `📋 ${detail}`; // 详情即正文，一眼看清要允许/已完成的内容
  } else {
    body = fallbackBody;
  }
  const cue = buildCue(eventType, isDanger, opts);
  // 一键复制：命令类事件把完整命令塞进 Bark copy 参数，长按通知即可复制，不必回终端手敲。
  if (rawDetail && SHORT_EVENTS.has(eventType)) {
    cue.copy = rawDetail.replace(/^[A-Za-z]\w*:\s*/, ''); // 去掉 "Bash: " 之类工具名前缀，复制纯命令
  }
  return { title, body, eventType, cue };
}

module.exports = { buildMessage, DEFAULT_SOUNDS };
