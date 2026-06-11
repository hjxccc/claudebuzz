'use strict';
// 把 Claude Code 的 hook 事件归类成内部 event_type。
// 基于实测 payload：Notification.message 含 "permission" 即权限请求；Stop=任务完成；
// PreToolUse 命中危险关键词=danger；PermissionRequest=权限请求。

const DANGER_KEYWORDS = [
  'rm -rf', 'sudo', 'git push', 'git reset --hard', 'git clean',
  'chmod', 'chown', 'dd ', 'mkfs', 'killall', ':(){', 'shutdown', 'reboot',
];

function toolText(raw) {
  const ti = raw.tool_input || {};
  return [raw.tool_name, ti.command, ti.file_path, ti.url, ti.path]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function classify(eventName, raw) {
  raw = raw || {};
  switch (eventName) {
    case 'Stop':
      return 'task_done';
    case 'PermissionRequest':
      return 'permission_required';
    case 'PermissionDenied':
      return 'permission_denied';
    case 'Notification': {
      const msg = String(raw.message || '').toLowerCase();
      const ntype = String(raw.notification_type || '').toLowerCase();
      if (msg.includes('permission') || ntype.includes('permission')) return 'permission_required';
      return 'attention_required';
    }
    case 'PreToolUse': {
      const txt = toolText(raw);
      if (DANGER_KEYWORDS.some((k) => txt.includes(k))) return 'danger';
      return 'info';
    }
    case 'PostToolUse': {
      const txt = JSON.stringify(raw).toLowerCase();
      if (/error|failed|exception|traceback|non-zero|exit code/.test(txt)) return 'failure';
      return 'info';
    }
    default:
      return 'info';
  }
}

module.exports = { classify, DANGER_KEYWORDS };
