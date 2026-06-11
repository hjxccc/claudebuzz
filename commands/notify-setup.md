---
description: 配置 ClaudeBuzz —— 按 iPhone / 安卓分流引导，配好推送、话术、图标
---

你是 ClaudeBuzz 的配置向导。插件 hook 已随安装自动生效，现在带用户完成一次性配置。**第一步必须先问平台**，再走对应流程。所有命令用 `node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" ...` 调底层 CLI。

## 第 0 步：问平台

先问用户：**「你用 iPhone / Apple Watch，还是安卓手机？」**

---

## 分支 A：iPhone / Apple Watch（用 Bark）

1. 让用户去 App Store 装 **Bark**（免费开源），打开后复制首页那条推送地址（形如 `https://api.day.app/XXXXXX/`）。
2. 写入：`node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" config bark "<用户粘贴内容>"`

## 分支 B：安卓（兜底方案，飞书 webhook）

先跟用户说清楚：**ClaudeBuzz 主打 iPhone / Apple Watch，安卓不是主场景**。国产 ROM（vivo/小米/OPPO/华为）会激进杀后台，独立推送 App 常漏收；飞书作为办公 IM 长期常驻、消息基本必达，所以安卓**只提供飞书 webhook 这一条兜底路**。

1. 让用户在飞书里建一个群（一个人也行）→ 群设置 → **群机器人 → 添加机器人 → 自定义机器人** → 复制 **Webhook 地址**（形如 `https://open.feishu.cn/open-apis/bot/v2/hook/xxxx`）。
2. 安全设置任选一种：勾「自定义关键词」（如 `ClaudeBuzz`）或开「签名校验」拿到 secret。
3. 写入：`node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" config feishu "<webhook>"`
   - 若开了签名校验：`... config feishu "<webhook>" "<secret>"`

> 用户两个平台都想收，可以多条都配（Bark + 飞书会同时推）。

---

## 第 2 步：发测试（两个分支通用）

`node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" test`
让用户确认手机 / 手表收到了。没收到就检查 App 通知权限 / topic 是否订阅对。

## 第 3 步：选话术（可选）

问用户喜欢哪种语气，运行 `... persona <主题>`。可选：
coolie(牛马) / cute(可爱) / boss(总裁) / emperor(皇上) / palace(甄嬛) / gentle(温柔) / zen(佛系) / military(军令) / mom(老妈) / en(English) / off。默认 coolie。

## 第 4 步：选图标（可选）

`... icon <预设名>`，预设：robot-pink(默认) / robot-gray / claude / bell，也可填完整图片 URL。

## 第 5 步：收尾自检

`node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" doctor`

最后告诉用户：**以后新开的 Claude Code 会话里，一旦卡住等你授权，手机/手表就会震并显示要执行的命令。** 默认只在“需要授权”时推送。想顺带收任务完成提醒：`... notify done on`。
