'use strict';
// 图标预设：config.icon 可填预设名（如 robot-pink）或完整 URL，发送时解析为 URL。
const PRESETS = {
  'robot-pink': 'https://cdn.jsdelivr.net/gh/hjxccc/agentwatch-assets@main/claude_robot_pink.png', // 默认
  'robot-gray': 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@latest/color/618x618/1F916.png',
  'claude': 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/light/claude-color.png',
  'bell': 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@latest/color/618x618/1F514.png',
};

function resolveIcon(value) {
  if (!value) return '';
  return PRESETS[value] || value; // 命中预设→URL；否则当作 URL 原样返回
}

function presetNames() {
  return Object.keys(PRESETS);
}

module.exports = { PRESETS, resolveIcon, presetNames };
