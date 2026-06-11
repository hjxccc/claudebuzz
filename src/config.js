'use strict';
// 配置读写：~/.claude/claudebuzz/config.json —— 零配置默认 + 一处可调。
const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'claudebuzz');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// 粉机器人图标（复用已托管的资源，可在 config 里改）
const DEFAULT_ICON =
  'https://cdn.jsdelivr.net/gh/hjxccc/agentwatch-assets@main/claude_robot_pink.png';

const DEFAULTS = {
  channels: [
    {
      type: 'bark',
      key: '',
      server: 'https://api.day.app',
      icon: DEFAULT_ICON,
      group: 'ClaudeCode',
      level: 'timeSensitive',
    },
  ],
  // 默认只在“需要你授权”时推送，其它静默——和我们验证过的体验一致。
  notify: {
    onPermission: true,
    onTaskDone: false,
    onAttention: false,
    onDanger: false,
  },
  persona: 'coolie',
  detailMaxLen: 45,
  dedupWindowMs: 8000,
};

function ensureDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function deepMerge(base, over) {
  if (Array.isArray(over)) return over;
  if (over && typeof over === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = deepMerge(base ? base[k] : undefined, over[k]);
    return out;
  }
  return over === undefined ? base : over;
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return deepMerge(DEFAULTS, raw);
    }
  } catch (e) {
    process.stderr.write(`[ClaudeBuzz] 配置解析失败，使用默认值: ${e.message}\n`);
  }
  return JSON.parse(JSON.stringify(DEFAULTS));
}

function saveConfig(cfg) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  return CONFIG_FILE;
}

module.exports = { CONFIG_DIR, CONFIG_FILE, DEFAULTS, DEFAULT_ICON, loadConfig, saveConfig, ensureDir };
