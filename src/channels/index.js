'use strict';
// 渠道注册表 + 分发。首发只有 bark；新增渠道（ntfy/telegram/feishu）只需在此注册。
const bark = require('./bark');
const ntfy = require('./ntfy');

const REGISTRY = {
  bark, // iOS / Apple Watch
  ntfy, // 跨平台（安卓 / 桌面 / 自托管）
  // telegram: require('./telegram'),  // v2
  // feishu: require('./feishu'),
};

// 向所有已配置渠道发送，返回每个渠道的结果数组。
async function dispatch(channels, msg) {
  const list = Array.isArray(channels) ? channels : [];
  const results = [];
  for (const ch of list) {
    const impl = REGISTRY[ch && ch.type];
    if (!impl) { results.push({ type: ch && ch.type, ok: false, info: '未知渠道' }); continue; }
    try {
      const r = await impl.send(ch, msg);
      results.push({ type: ch.type, ...r });
    } catch (e) {
      results.push({ type: ch.type, ok: false, info: e.message });
    }
  }
  return results;
}

module.exports = { REGISTRY, dispatch };
