# ClaudeBuzz v1.1 功能丰富

## 目标
在 v1（双渠道 Bark/ntfy）基础上丰富开箱体验，降低首次配置门槛。

## 需求

### 1. 按平台分流的首次引导（新增·重点）
首次 `/notify-setup` 时先问用户用 **iPhone 还是安卓**，再走不同流程：
- **iPhone/Apple Watch** → 引导装 Bark（App Store）→ 粘贴 Bark key → `config bark`
- **安卓** → 引导装 ntfy（Google Play / F-Droid / APK GitHub）→ 起一个随机 topic → `config ntfy`
- 之后统一：选 persona → 选图标 → 发测试 → doctor
CLI 需提供 `config ntfy` 作为 `config bark` 的对等命令。

### 2. 更多内置 persona 语气
现有 off/cute/coolie/boss/emperor/palace。新增：
- `en`（英文版，面向国际开源用户）
- `gentle`（温柔版）、`zen`（佛系版）、`military`（军令版）、`mom`（老妈版）
每个覆盖全部 event_type。

### 3. 图标预设 + 默认图片 + 自定义
- 新增 `src/icons.js`：预设名→URL 映射（`robot-pink` 默认 / `robot-gray` / `claude` / `bell`），`config.icon` 可填预设名或完整 URL，发送时解析。
- 默认配置 icon 改为预设名 `robot-pink`（更干净，"有个默认图片"）。
- CLI `claudebuzz icon <预设名|URL>` 切换。

### 4. 通知类型可配可切
- `notify` 增加 `onFailure`；`policy.shouldSend` 支持 failure。
- CLI `claudebuzz notify`（列出）/ `claudebuzz notify <permission|done|attention|danger|failure> <on|off>`。
- README 文档化每种通知类型。

## 验收
- `node --test` 全绿（含 icons 解析、persona 数量、config ntfy 解析、notify 开关）。
- `claudebuzz config ntfy <topic>` / `claudebuzz notify done on` / `claudebuzz icon claude` 均生效并写 config。
- `/notify-setup` 文案按平台分流。
- 不破坏 v1 已验证的 hook 行为（Stop/Notification/PermissionRequest）。

## 不做（留 v2）
远程批准、Telegram/飞书渠道、自托管引导向导。
