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

## 分支 B：安卓（用 ntfy）

1. 让用户装 **ntfy** App（任选）：
   - Google Play: https://play.google.com/store/apps/details?id=io.heckel.ntfy
   - F-Droid: https://f-droid.org/en/packages/io.heckel.ntfy/
   - APK: https://github.com/binwiederhier/ntfy-android/releases
2. 让用户在 App 里**订阅一个自己起的 topic**（建议随机难猜，如 `claudebuzz-x7k9q2`；公共服务器上 topic 名就是密码）。
3. 写入：`node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" config ntfy "<topic>"`

> 用户两个平台都想收，可以两条都配（Bark + ntfy 会同时推）。

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
