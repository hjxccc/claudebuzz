'use strict';
// persona 话术主题：标题承载语气，正文（无详情时的兜底）保持简短。
// 移植自 agentwatch/persona.py，并按“标题带语气、正文=详情”的新设计精简。

const THEME_NAMES = {
  off: 'Off',
  cute: '可爱版',
  coolie: '牛马版',
  boss: '总裁版',
  emperor: '皇上版',
  palace: '甄嬛版',
  gentle: '温柔版',
  zen: '佛系版',
  military: '军令版',
  mom: '老妈版',
  en: 'English',
};

const PERSONAS = {
  cute: {
    permission_required: { title: '主人，要点头啦 (๑•̀ㅂ•́)و', body: '点一下 Allow 呀~' },
    task_done: { title: '搞定啦~ ヽ(✿ﾟ▽ﾟ)ノ', body: '回来验收嘛~' },
    attention_required: { title: '主人，看我一下嘛 (´･ω･`)', body: '回来瞅一眼~' },
    danger: { title: '危险危险！(｡>﹏<｡)', body: '快回来确认！' },
    drift: { title: '好像跑偏了诶~', body: '回来看看~' },
    failure: { title: '卡住惹 (╥﹏╥)', body: '回来帮我看看~' },
    info: { title: '一切顺利~', body: '安心摸鱼吧~' },
    possible_permission_wait: { title: '好像在等你哦~', body: '有空看一眼~' },
    permission_denied: { title: '好的不做啦~', body: '乖乖不碰咯~' },
  },
  coolie: {
    permission_required: { title: '喂！牛马！过来允许一下', body: '点一下 Allow，快！' },
    task_done: { title: '这批干完了，验收！', body: '回来验收，下一批。' },
    attention_required: { title: '牛马！叫你呢，回来！', body: '回来处理。' },
    danger: { title: '捅娄子了！快回来盯！', body: '立刻回来确认。' },
    drift: { title: '跑偏了！拉回来！', body: '回来收窄任务。' },
    failure: { title: '又卡了？！回来收拾！', body: '回来看哪儿卡了。' },
    info: { title: '继续搬砖', body: '接着干。' },
    possible_permission_wait: { title: '是不是在等你？去看！', body: '回电脑瞄一眼。' },
    permission_denied: { title: '驳回了，白干', body: '已拒绝，重来。' },
  },
  boss: {
    permission_required: { title: '总裁快签字', body: '回电脑点 Allow。' },
    task_done: { title: '项目拿下了', body: '回电脑验收成果。' },
    attention_required: { title: '全场等您一句话', body: '回电脑处理。' },
    danger: { title: '有人动了保险柜', body: '立即回电脑确认。' },
    drift: { title: '他们开始不听话了', body: '收窄任务范围。' },
    failure: { title: '他们又撞墙了', body: '回电脑查看阻塞。' },
    info: { title: '暂时稳住了', body: '您可以继续摸鱼。' },
    possible_permission_wait: { title: '会议室还亮着', body: '有空回电脑看看。' },
    permission_denied: { title: '文件被驳回', body: '已驳回。' },
  },
  emperor: {
    permission_required: { title: '奏请御批', body: '请回电脑点 Allow。' },
    task_done: { title: '差事办妥', body: '请您御览。' },
    attention_required: { title: '请皇上定夺', body: '特来请您圣裁。' },
    danger: { title: '触犯禁区', body: '请速速御览。' },
    drift: { title: '办差走偏', body: '方向似乎偏了。' },
    failure: { title: '奴才办不动了', body: '请您亲自过问。' },
    info: { title: '正在办差', body: '暂不用您操心。' },
    possible_permission_wait: { title: '疑似候旨', body: '得空回电脑瞧瞧。' },
    permission_denied: { title: '御批驳回', body: '不敢再办。' },
  },
  palace: {
    permission_required: { title: '请主子示下', body: '回电脑示下。' },
    task_done: { title: '差事已成', body: '请您过目。' },
    attention_required: { title: '请主子定夺', body: '请您亲自定夺。' },
    danger: { title: '宫中有异动', body: '此事不宜拖延。' },
    drift: { title: '办事失了分寸', body: '恐怕得您敲打。' },
    failure: { title: '差事受阻', body: '奴才们撑不住了。' },
    info: { title: '暂且安稳', body: '暂不劳您费心。' },
    possible_permission_wait: { title: '事情未落定', body: '许是在等您示下。' },
    permission_denied: { title: '示下已回', body: '不敢再动。' },
  },
  gentle: {
    permission_required: { title: '需要你点一下哦', body: '回电脑点 Allow 就好啦~' },
    task_done: { title: '已经完成啦', body: '有空回来看看~' },
    attention_required: { title: '需要你看一下', body: '回电脑瞧瞧吧~' },
    danger: { title: '这步有点风险', body: '麻烦回电脑确认一下~' },
    drift: { title: '好像有点偏', body: '回来看看方向~' },
    failure: { title: '好像卡住了', body: '回来帮忙看看吧~' },
    info: { title: '一切都好', body: '安心忙你的~' },
    possible_permission_wait: { title: '可能在等你', body: '得空看一眼~' },
    permission_denied: { title: '好的，不做啦', body: '已经停下来咯~' },
  },
  zen: {
    permission_required: { title: '随缘点个允许', body: '有空再点 Allow，不急。' },
    task_done: { title: '事了拂衣去', body: '完成了，看不看随你。' },
    attention_required: { title: '有事相扰', body: '得空看一眼便是。' },
    danger: { title: '稍有风险', body: '看一眼，心安即可。' },
    drift: { title: '似有偏移', body: '顺其自然，看看就好。' },
    failure: { title: '遇阻数次', body: '不强求，回来看看。' },
    info: { title: '一切随缘', body: '安心，无需挂念。' },
    possible_permission_wait: { title: '或在等你', body: '随缘看一眼。' },
    permission_denied: { title: '已然作罢', body: '放下，便是。' },
  },
  military: {
    permission_required: { title: '请求授权', body: '立即回电脑下令 Allow！' },
    task_done: { title: '任务达成', body: '请验收，等待下一指令。' },
    attention_required: { title: '需要决断', body: '请回电脑指示。' },
    danger: { title: '高危！请确认', body: '立即回电脑确认放行与否！' },
    drift: { title: '偏离航向', body: '请修正目标。' },
    failure: { title: '连续受阻', body: '请回电脑排障。' },
    info: { title: '行动中', body: '一切正常，待命。' },
    possible_permission_wait: { title: '疑似待令', body: '请尽快回电脑查看。' },
    permission_denied: { title: '已驳回', body: '指令终止，已记录。' },
  },
  mom: {
    permission_required: { title: '快来点一下！', body: '就等你点个 Allow，磨蹭啥呢快回来！' },
    task_done: { title: '弄完了！', body: '过来看看，别老让我喊你！' },
    attention_required: { title: '叫你呢！', body: '回来处理一下，听见没！' },
    danger: { title: '哎哟要出事！', body: '赶紧回来看着点，别瞎搞！' },
    drift: { title: '又跑偏了！', body: '说你呢，回来弄正！' },
    failure: { title: '咋又不行了！', body: '回来收拾收拾，急死个人！' },
    info: { title: '还在弄', body: '行了行了，忙你的去吧。' },
    possible_permission_wait: { title: '是不是等你呢？', body: '快回去看看，别让人等！' },
    permission_denied: { title: '不许弄！', body: '说不行就不行，停下！' },
  },
  en: {
    permission_required: { title: 'Approval needed', body: 'Tap Allow on your computer.' },
    task_done: { title: 'Task done', body: 'Come back and review.' },
    attention_required: { title: 'Needs your attention', body: 'Check your computer.' },
    danger: { title: 'Risky operation!', body: 'Confirm on your computer now.' },
    drift: { title: 'Going off track', body: 'Take a look.' },
    failure: { title: 'Stuck — repeated failures', body: 'Check what went wrong.' },
    info: { title: 'In progress', body: '' },
    possible_permission_wait: { title: 'Maybe waiting for you', body: 'Take a glance.' },
    permission_denied: { title: 'Denied', body: 'Logged, no action needed.' },
  },
};

const DEFAULT_TITLES = {
  permission_required: '需要权限',
  task_done: '任务完成',
  attention_required: 'Agent 需要你处理',
  danger: '高风险操作',
  drift: '可能跑偏',
  failure: '可能卡住',
  info: '进行中',
  possible_permission_wait: '疑似等待权限',
  permission_denied: '权限已拒绝',
};

const DEFAULT_BODIES = {
  permission_required: '回电脑点击 Allow / Yes',
  task_done: '回电脑验收',
  attention_required: '回电脑查看',
  danger: '立即回电脑确认',
  drift: '回电脑查看',
  failure: '回电脑检查状态',
  info: '',
  possible_permission_wait: '有空回电脑看一眼',
  permission_denied: '已记录，无需操作',
};

// 返回 { title, body }。persona='off' 用朴素文案。
function applyPersona(eventType, persona) {
  const fallback = {
    title: DEFAULT_TITLES[eventType] || 'ClaudeBuzz 提醒',
    body: DEFAULT_BODIES[eventType] || '',
  };
  if (!persona || persona === 'off') return fallback;
  const tpl = (PERSONAS[persona] || {})[eventType];
  if (!tpl) return fallback;
  return { title: tpl.title, body: tpl.body };
}

function validThemes() {
  return Object.keys(THEME_NAMES);
}

module.exports = { THEME_NAMES, PERSONAS, applyPersona, validThemes };
