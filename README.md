# ClaudeBuzz 🤖⌚

> Claude Code 卡住等你授权时，主动把通知推到你的**手机 / Apple Watch**——零配置 Claude Code 插件，走苹果官方推送。

你是不是也遇到过：给 Claude Code 派了个活儿，转头去刷手机/倒水/开会，回过神来发现它**早就卡在 `Do you want to proceed?` 等你点「允许」**，白白浪费十几分钟？

ClaudeBuzz 让它在需要你的那一刻**主动震你手腕**，还告诉你它卡在哪条命令上。

![ClaudeBuzz 推送原理](docs/flow.png)

## ✨ 特点

- **零配置安装**：作为 Claude Code 插件分发，`/plugin install` 后 hook 自动注册，**无需手动改 `settings.json`**。
- **只在该打扰时打扰**：默认**只在需要你授权时**推送，任务进度、普通事件一律静默。
- **带真实命令详情**：通知正文直接显示它要执行的命令（`Bash: git push…` / `rm -rf…`），扫一眼就知道该不该放行。
- **走苹果官方推送**：经 [Bark](https://github.com/Finb/Bark) → 苹果 APNs → iPhone → Apple Watch，稳定省电。
- **话术可换**：内置 `coolie`(牛马版) / `cute`(可爱版) / `boss`(总裁版) / `emperor` / `palace`，一条命令切换。
- **跨平台 · 零依赖**：纯 Node.js 内置模块，Windows / macOS / Linux 通吃，原生 UTF-8，无 GBK 乱码坑。

## 🚀 安装（两条命令）

```text
/plugin marketplace add hjxccc/claudebuzz
/plugin install claudebuzz
```

然后在 Claude Code 里运行配置向导：

```text
/notify-setup
```

它会引导你：粘贴 Bark key → 发测试推送 → 选话术。**搞定后新会话即生效**——Claude Code 一卡住等授权，手腕立刻震。

> 需要先在手机装 [Bark](https://apps.apple.com/app/bark/id1403753865)（免费开源，iOS）并复制首页的推送地址。

## 🔧 手动配置（可选）

不想用 `/notify-setup` 也可以直接用自带 CLI：

```bash
node bin/claudebuzz.js config bark "https://api.day.app/你的KEY/"
node bin/claudebuzz.js test          # 发测试推送
node bin/claudebuzz.js persona cute  # 切换话术
node bin/claudebuzz.js doctor        # 健康检查
```

## ⚙️ 配置文件

`~/.claude/claudebuzz/config.json`：

```json
{
  "channels": [
    { "type": "bark", "key": "", "server": "https://api.day.app",
      "icon": "https://cdn.jsdelivr.net/gh/hjxccc/agentwatch-assets@main/claude_robot_pink.png",
      "group": "ClaudeCode", "level": "timeSensitive" }
  ],
  "notify": { "onPermission": true, "onTaskDone": false, "onAttention": false, "onDanger": false },
  "persona": "coolie",
  "detailMaxLen": 45,
  "dedupWindowMs": 8000
}
```

想顺带收「任务完成」提醒，把 `notify.onTaskDone` 改成 `true` 即可。

## 🗺️ 路线图

- **v1（当前）**：Claude Code 插件 + Bark 推送 + 按需推送 + 命令详情 + persona + 去重。
- **v2**：多渠道（ntfy / Telegram / 飞书 / Server酱）；**手机一键 allow/deny 远程批准**（PreToolUse 决定 + 本地中继）；自建 Bark 服务器引导。

## 🙏 致谢

灵感与早期实现思路来自开源项目 [AgentWatch](https://github.com/dongxutang918-afk/agentwatch)；推送链路依赖 [Bark](https://github.com/Finb/Bark)。ClaudeBuzz 在其基础上做成了零配置插件，并内置了命令详情提取、按需推送、persona、去重等改进。

## 📄 License

MIT
