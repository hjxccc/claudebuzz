'use strict';
// ClaudeBuzz hook 入口。Claude Code 通过 stdin 把事件 JSON 喂进来。
// 流程：分类 → 策略(是否要推) → 提取详情 → 组装消息 → 去重 → 发送渠道。永远 exit 0，绝不拖垮 Claude Code。

const { loadConfig } = require('./config');
const { classify, isDangerText } = require('./classify');
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
  // 危险判定看命令文本：哪怕是“请求允许执行 rm -rf”这类 permission 事件，也升级推送。
  const isDanger = eventType === 'danger' || isDangerText(detail);
  const msg = buildMessage(eventType, {
    detail,
    persona: cfg.persona,
    detailMaxLen: cfg.detailMaxLen,
    isDanger,
    sounds: cfg.sounds,
    dangerCue: cfg.danger,
  });
  const dedupKey = `${eventType}|${raw.session_id || ''}|${String(detail).slice(0, 80)}`;
  return { eventName, eventType, willSend, detail, msg, dedupKey };
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    let done = false;
    let timer = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(data);
    };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
    timer = setTimeout(finish, 3000); // 安全兜底
    if (timer.unref) timer.unref();   // 不阻塞 event loop 自然退出
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
  try {
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
  } catch (e) {
    skipped = 'error:' + e.message;
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
