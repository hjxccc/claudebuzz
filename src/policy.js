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
    // info / drift / failure / permission_denied / possible_permission_wait 默认静默
    default:
      return false;
  }
}

module.exports = { shouldSend };
