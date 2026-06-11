'use strict';
// 从真实 hook payload 里提取“要展示的详情”——这是相比 agentwatch 早期版本的关键修复：
//   task_done           → raw.last_assistant_message（Stop 直接带），兜底读 transcript 最后一段助手文本
//   permission_required → transcript 最后一个 tool_use（正等授权的命令），兜底 tool_input / message
//   danger / drift      → tool_input 摘要
// 任何失败都返回 ''，绝不抛错（hook 必须稳）。

const fs = require('fs');

function readTranscript(tpath) {
  try {
    if (!tpath || !fs.existsSync(tpath)) return [];
    // 长会话 transcript 可能很大；超过 8MB 直接跳过，避免 hook 进程同步读爆内存。
    try { if (fs.statSync(tpath).size > 8 * 1024 * 1024) return []; } catch (_) {}
    const out = [];
    for (const line of fs.readFileSync(tpath, 'utf8').split('\n')) {
      const s = line.trim();
      if (!s) continue;
      try { out.push(JSON.parse(s)); } catch (_) { /* 跳过坏行 */ }
    }
    return out;
  } catch (_) {
    return [];
  }
}

function collapse(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

function lastAssistantText(transcript) {
  let last = '';
  for (const o of transcript) {
    if (o.type !== 'assistant') continue;
    const content = (o.message || {}).content;
    if (Array.isArray(content)) {
      const t = content.filter((b) => b && b.type === 'text').map((b) => b.text || '').join(' ').trim();
      if (t) last = t;
    } else if (typeof content === 'string' && content.trim()) {
      last = content.trim();
    }
  }
  return collapse(last);
}

function toolSummaryFromInput(name, input) {
  input = input || {};
  let snippet =
    input.command || input.file_path || input.url || input.path || input.notebook_path || '';
  if (!snippet) {
    for (const v of Object.values(input)) {
      if (typeof v === 'string' && v.length > 2) { snippet = v; break; }
    }
  }
  snippet = collapse(snippet);
  const n = name || 'Tool';
  return snippet ? `${n}: ${snippet}` : (name ? n : '');
}

function lastToolUseSummary(transcript) {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const o = transcript[i];
    if (o.type !== 'assistant') continue;
    const content = (o.message || {}).content;
    if (!Array.isArray(content)) continue;
    const tus = content.filter((b) => b && b.type === 'tool_use');
    if (tus.length) {
      const tu = tus[tus.length - 1];
      return toolSummaryFromInput(tu.name, tu.input);
    }
  }
  return '';
}

function extractDetail(eventType, raw) {
  try {
    raw = raw || {};
    const tpath = raw.transcript_path || raw.transcriptPath || '';

    if (eventType === 'task_done') {
      const lam = raw.last_assistant_message;
      if (typeof lam === 'string' && lam.trim()) return collapse(lam);
      return lastAssistantText(readTranscript(tpath));
    }

    if (eventType === 'permission_required' || eventType === 'possible_permission_wait') {
      const d = lastToolUseSummary(readTranscript(tpath));
      if (d) return d;
      const s = toolSummaryFromInput(raw.tool_name, raw.tool_input);
      if (s && s.toLowerCase() !== 'unknown') return s;
      return typeof raw.message === 'string' ? raw.message : '';
    }

    if (eventType === 'attention_required') {
      if (typeof raw.message === 'string' && raw.message.trim()) return raw.message.trim();
      return lastToolUseSummary(readTranscript(tpath));
    }

    if (eventType === 'danger' || eventType === 'drift') {
      return toolSummaryFromInput(raw.tool_name, raw.tool_input);
    }
    return '';
  } catch (_) {
    return '';
  }
}

module.exports = { extractDetail, readTranscript, lastAssistantText, lastToolUseSummary, toolSummaryFromInput };
