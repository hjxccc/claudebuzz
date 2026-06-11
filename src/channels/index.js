'use strict';
// 渠道注册表 + 分发。主打 bark（iPhone/Apple Watch）；安卓兜底 feishu。
const bark = require('./bark');
const pushdeer = require('./pushdeer');
const feishu = require('./feishu');

const REGISTRY = {
  bark, // iOS / Apple Watch（主打）
  feishu, // 飞书 webhook（安卓兜底，国产手机最稳）
  pushdeer, // 开源 Bark 替代（iOS/安卓/桌面/自托管）
  // telegram: require('./telegram'),  // v2
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
