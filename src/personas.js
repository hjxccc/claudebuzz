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
