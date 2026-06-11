'use strict';
// ClaudeBuzz hook 入口。Claude Code 通过 stdin 把事件 JSON 喂进来。
// 流程：分类 → 策略(是否要推) → 提取详情 → 组装消息 → 去重 → 发送渠道。永远 exit 0，绝不拖垮 Claude Code。

const { loadConfig } = require('./config');
const { classify } = require('./classify');
const { shouldSend } = require('./policy');
const { extractDetail } = require('./detail');
const { buildMessage } = require('./message');
const { isDuplicate, appendLog } = require('./store');
const channels = require('./channels');

// 纯函数：便于单测（不联网、不读写状态）。
function processEvent(eventName, raw, cfg) {
  raw = raw || {};
  const eventType = classify(eventName, raw);
  const willSend = shouldSend(eventType, cfg.notify);
  const detail = extractDetail(eventType, raw);
  const msg = buildMessage(eventType, {
    detail,
    persona: cfg.persona,
    detailMaxLen: cfg.detailMaxLen,
  });
  const dedupKey = `${eventType}|${raw.session_id || ''}|${detail}`;
  return { eventName, eventType, willSend, detail, msg, dedupKey };
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 3000); // 安全兜底
  });
}

function parseEventArg(argv) {
  const i = argv.indexOf('--event');
  return i >= 0 && argv[i + 1] ? argv[i + 1] : 'Notification';
}

async function main() {
  const eventName = parseEventArg(process.argv);
  let raw = {};
  try {
    const text = (await readStdin()).trim();
    if (text) raw = JSON.parse(text);
  } catch (_) { raw = {}; }

  let cfg;
  try { cfg = loadConfig(); } catch (_) { process.exit(0); return; }

  const r = processEvent(eventName, raw, cfg);

  let notified = false;
  let skipped = '';
  if (r.willSend) {
    if (isDuplicate(r.dedupKey, cfg.dedupWindowMs || 8000)) {
      skipped = 'dedup';
    } else {
      const results = await channels.dispatch(cfg.channels, r.msg);
      notified = results.some((x) => x.ok);
      if (!notified) skipped = 'send_failed';
    }
  } else {
    skipped = 'policy';
  }

  appendLog({
    ts: new Date().toISOString(),
    event: eventName,
    type: r.eventType,
    title: r.msg.title,
    body: r.msg.body,
    notified,
    skipped,
  });

  process.exit(0);
}

if (require.main === module) {
  main().catch(() => process.exit(0));
}

module.exports = { processEvent };
