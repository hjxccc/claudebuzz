'use strict';
// 轻量状态：去重（PermissionRequest + Notification 可能为同一次授权连发）+ 事件日志。
const fs = require('fs');
const path = require('path');
const { CONFIG_DIR, ensureDir } = require('./config');

const STATE_FILE = path.join(CONFIG_DIR, 'state.json');
const LOG_FILE = path.join(CONFIG_DIR, 'events.jsonl');

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return { recent: {} }; }
}
function writeState(s) {
  try { ensureDir(); fs.writeFileSync(STATE_FILE, JSON.stringify(s), 'utf8'); } catch (_) {}
}

// 同一 key 在 windowMs 内重复出现 → 判定为重复，返回 true（应跳过）。
function isDuplicate(key, windowMs, now) {
  now = now || Date.now();
  const s = readState();
  s.recent = s.recent || {};
  // 清理过期项，防止无限增长
  for (const k of Object.keys(s.recent)) {
    if (now - s.recent[k] > Math.max(windowMs, 60000)) delete s.recent[k];
  }
  const last = s.recent[key];
  const dup = last != null && now - last < windowMs;
  s.recent[key] = now;
  writeState(s);
  return dup;
}

function appendLog(entry) {
  try {
    ensureDir();
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (_) {}
}

module.exports = { STATE_FILE, LOG_FILE, isDuplicate, appendLog };
