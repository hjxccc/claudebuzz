'use strict';
// 把 Claude Code 的 hook 事件归类成内部 event_type。
// 基于实测 payload：Notification.message 含 "permission" 即权限请求；Stop=任务完成；
// PreToolUse 命中危险关键词=danger；PermissionRequest=权限请求。

const DANGER_KEYWORDS = [
  'rm -rf', 'sudo', 'git push', 'git reset --hard', 'git clean',
  'chmod', 'chown', 'dd ', 'mkfs', 'killall', ':(){', 'shutdown', 'reboot',
];

// 文本里是否含危险操作关键词（命令详情也走这条，故 permission 请求执行 rm -rf 也能被升级）。
function isDangerText(text) {
  const t = String(text || '').toLowerCase();
  return DANGER_KEYWORDS.some((k) => t.includes(k));
}

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
      // 只看结构化字段，避免对可能很大的 tool_output 做全量序列化。
      const err = String(raw.error || raw.stderr || '');
      const code = raw.exit_code;
      if (err || (typeof code === 'number' && code !== 0)) return 'failure';
      return 'info';
    }
    default:
      return 'info';
  }
}

module.exports = { classify, isDangerText, DANGER_KEYWORDS };
