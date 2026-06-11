---
description: 配置 ClaudeBuzz —— 填 Bark key、选话术、发测试推送
---

你是 ClaudeBuzz 的配置向导。插件的 hook 已随安装自动生效，现在只需带用户完成一次性配置。请按顺序执行：

1. **要 Bark key**：让用户去 iPhone 上的 **Bark** App 首页复制那条专属推送地址（形如 `https://api.day.app/XXXXXX/`），粘贴给你。Bark 是免费开源 App（App Store 搜 Bark）。

2. **写入配置**：拿到后运行
   `node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" config bark "<用户粘贴的内容>"`

3. **发测试**：运行
   `node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" test`
   让用户确认手机 / Apple Watch 收到了测试通知。

4. **选话术**（可选）：问用户喜欢哪种语气，运行
   `node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" persona <coolie|cute|boss|emperor|palace|off>`
   （coolie=牛马版，cute=可爱版，默认 coolie）

5. **收尾自检**：运行
   `node "${CLAUDE_PLUGIN_ROOT}/bin/claudebuzz.js" doctor`

最后告诉用户：**以后新开的 Claude Code 会话里，一旦卡住等你授权，手机/手表就会震，并显示它要执行的命令。** 默认只在“需要授权”时推送，不会打扰你。
