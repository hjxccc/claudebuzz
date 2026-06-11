'use strict';
// 推送策略：默认只在“需要你授权”时推，其它静默（onTaskDone/onAttention/onDanger 可在 config 打开）。

function shouldSend(eventType, notify) {
  notify = notify || {};
  switch (eventType) {
    case 'permission_required':
      return notify.onPermission !== false; // 默认开
    case 'task_done':
      return notify.onTaskDone === true;
    case 'attention_required':
      return notify.onAttention === true;
    case 'danger':
      return notify.onDanger === true;
    case 'failure':
      return notify.onFailure === true;
    // info / drift / permission_denied / possible_permission_wait 默认静默
    default:
      return false;
  }
}

// 解析 "HH:MM" → 距零点分钟数；非法返回 null。
function parseHM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s == null ? '' : s).trim());
  if (!m) return null;
  const h = +m[1], min = +m[2];
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// 当前是否在勿扰时段内。支持跨夜窗口（如 23:00–08:00）。nowMin = 距零点分钟数。
function isQuietNow(quietHours, nowMin) {
  if (!quietHours || !quietHours.enabled) return false;
  const s = parseHM(quietHours.start);
  const e = parseHM(quietHours.end);
  if (s == null || e == null || s === e) return false;
  if (s < e) return nowMin >= s && nowMin < e;   // 同日窗口：09:00–17:00
  return nowMin >= s || nowMin < e;              // 跨夜窗口：23:00–08:00
}

// 取当前距零点分钟数（用真实时间；测试可绕过此函数直接传 nowMin）。
function nowMinutes(date) {
  const d = date || new Date();
  return d.getHours() * 60 + d.getMinutes();
}

module.exports = { shouldSend, isQuietNow, parseHM, nowMinutes };
