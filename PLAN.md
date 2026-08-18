# GeoContacts PWA + Web Push 实施计划

> 本计划从 Cursor 对话「站级PWA推送计划」整理而来，经多轮审查修正。

## 架构总览

```
┌─────────────────────────────────────────────────────┐
│                 浏览器 / PWA                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  React   │  │  SW      │  │  IndexedDB       │  │
│  │  页面    │  │  (sw.ts) │  │  (本地通讯录)    │  │
│  └────┬─────┘  └────┬─────┘  └──────────────────┘  │
│       │             │  PushEvent                    │
│       │  WS         │  NotificationClick            │
│       ▼             ▼                               │
└───────┼─────────────┼───────────────────────────────┘
        │             │
        │  /api/*     │  /ws
        ▼             ▼
┌─────────────────────────────────────────────────────┐
│                Express Server                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Routes  │  │Presence  │  │  Push Service    │  │
│  │  /push   │  │(WS)      │  │  (web-push)      │  │
│  │  /friends│  │          │  │  + VAPID         │  │
│  │  /messages│  │          │  │                   │  │
│  └────┬─────┘  └──────────┘  └────────┬──────────┘  │
│       │                                │             │
│       ▼                                ▼             │
│  ┌────────────────────────────────────────────────┐  │
│  │              SQLite (better-sqlite3)           │  │
│  │  users / friendships / conversations /         │  │
│  │  messages / push_subscriptions                 │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Phase 1: PWA 基础配置 ✓（已完成）

### 1.1 构建配置

| 项目 | 值 | 文件 |
|------|-----|------|
| 策略 | `injectManifest` | `vite.config.ts` |
| 源文件 | `src/sw.ts` | 编译为 `dist/sw.js` |
| 注册方式 | `registerType: 'autoUpdate'` | 自动更新 |
| 预缓存 | `globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}']` | 构建时生成 |

### 1.2 Manifest

| 属性 | 值 |
|------|------|
| `name` | GeoContacts 地理通讯录 |
| `short_name` | GeoContacts |
| `display` | `standalone` |
| `start_url` | `VITE_BASE`（构建时，如 `/geo-contacts/`） |
| `scope` | `VITE_BASE`（构建时，如 `/geo-contacts/`） |
| `theme_color` | `#2563eb` |
| `background_color` | `#f8fafc` |

### 1.3 图标

| 文件 | 用途 |
|------|------|
| `public/pwa-192.png` | 192×192 any |
| `public/pwa-512.png` | 512×512 any + maskable |
| `public/favicon.svg` | SVG 任意尺寸 |

### 1.4 安装引导

- 设置页增加「安装到主屏幕」引导按钮
- 支持 `beforeinstallprompt` 事件拦截
- iOS 检测：`isIosDevice()` + `isStandaloneDisplay()` 区分

## Phase 2: Web Push 推送 ✓（已完成）

### 2.1 后端推送服务

**文件**：`server/push.ts`

| 组件 | 实现 |
|------|------|
| VAPID 配置 | `webpush.setVapidDetails()`，启动时检查，缺则降级关闭 |
| 速率限制 | 每用户每 60 秒最多 40 条，超限静默跳过 |
| 订阅上限 | 每用户最多 10 个端点，超限删最旧的 |
| 合拼策略 | **首条立即推，COALESCE_MS(15s) 窗口内后续合并发尾条** |
| 推送 TTL | 3600 秒，`urgency: 'normal'` |
| 通知分组 | `Topic` 头对 `chat:${conversationId}` 做浏览器级分组 |
| 订阅清理 | 404/410/401/403 时自动删除无效订阅 |
| Payload 限制 | 超过 3500 字节时静默跳过 |

**合拼逻辑**（`sendPushToUser` 的 `{ coalesce: true }` 选项）：

```
sendPushToUser(userId, payload1, { coalesce: true })   // t=0: 立即发送 payload1
sendPushToUser(userId, payload2, { coalesce: true })   // t=5s: 更新 pending payload
sendPushToUser(userId, payload3, { coalesce: true })   // t=10s: 更新 pending payload
                                                        // t=15s: 发送 payload3（尾条）
```

### 2.2 API 路由

**文件**：`server/routes/push.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/push/vapid-public-key` | 返回 VAPID 公钥 + 配置状态 |
| GET | `/api/push/status` | 返回推送配置状态 + 用户偏好 |
| POST | `/api/push/subscribe` | 保存订阅端点 |
| DELETE | `/api/push/subscribe` | 删除订阅（支持 body 和 query） |
| PATCH | `/api/push/preferences` | 更新 `push_show_preview` |

### 2.3 推送触发场景

| 场景 | 函数 | 是否合拼 | 文件 |
|------|------|---------|------|
| 新消息 | `buildChatPush()` → `sendPushToUser()` | ✅ 是 | `routes/messages.ts` |
| 好友请求 | `buildFriendRequestPush()` → `sendPushToUser()` | ❌ 否 | `routes/friends.ts` |
| 好友通过 | `buildFriendAcceptedPush()` → `sendPushToUser()` | ❌ 否 | `routes/friends.ts` |

### 2.4 Service Worker

**文件**：`src/sw.ts`

| 事件 | 处理逻辑 |
|------|----------|
| `push` | 解析 JSON payload，调用 `showNotification`，若用户正在看该会话则关闭通知 |
| `notificationclick` | 关闭通知，查找已有窗口优先 focus+navigate，否则 openWindow |
| `pushsubscriptionchange` | 尝试重新订阅，通过 `postMessage` 通知前端 |

**通知关闭策略**（`shouldCloseAfterShow`）：

```
用户正在看会话 A → 收到会话 A 的推送 → SW 检测到 focused 窗口正在看 A → 关闭通知
用户正在看会话 A → 收到会话 B 的推送 → 正常显示通知
```

### 2.5 客户端订阅管理

**文件**：`src/lib/push.ts`

| 函数 | 说明 |
|------|------|
| `pushSupported()` | 检测浏览器是否支持推送 |
| `enablePushNotifications()` | 请求权限 → 订阅 → 上报服务端 |
| `syncPushSubscription()` | 同步现有订阅（VAPID key 变更时重新订阅） |
| `disablePushNotifications()` | 取消订阅并通知服务端删除 |
| `teardownPushOnLogout()` | 登出时清理（先捕获 token 再异步操作，避免竞态） |
| `flushPendingPushSubscription()` | 处理 SW 在 app 关闭时因 `pushsubscriptionchange` 产生的待处理订阅 |

### 2.6 数据库

**`push_subscriptions` 表**：

```sql
CREATE TABLE push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
```

**`users` 表新增字段**：

```sql
ALTER TABLE users ADD COLUMN push_show_preview INTEGER NOT NULL DEFAULT 1;
```
（通过 `ensureColumn()` 兼容旧表）

## Phase 3: 后续（未开始）

### 3.1 加载更早消息

- 后端已有 `before` 分页，前端需要加「加载更多」按钮
- 成本评定：纯文本历史几乎零成本，可随时开放

### 3.2 Capacitor 原生壳

- 当需要稳定 iOS 推送或上架应用商店时考虑
- 代码主体不变，用 Capacitor 包一层原生壳
- 推送走 FCM/APNs 通道

### 3.3 大陆 Android 离线推送

- 纯 PWA 在大陆 Android 离线推送基本不可用
- 需要原生壳 + 厂商推送通道（小米、华为、OPPO、vivo）
- 成本：小用户量免费档够用，门槛在维护双端工程

## 关键决策记录

### D1: 推送策略 —— 从"只推离线"改为"全推+SW抑制"

**背景**：原方案检查 `isUserOnline()`，只有离线才推送。但多设备场景下，用户电脑开着网页 → 服务端认为在线 → 手机收不到推送。

**结论**：WS 和 Push 都发，弹不弹由 SW 决定。SW 检查 `client.focused` 和会话匹配。

### D2: 合拼策略 —— 首条立即推，窗口内合并

**背景**：同会话连续发消息会刷屏通知。

**结论**：首条立即发送，后续 15 秒窗口内只更新 payload，窗口结束时发送尾条（`dirty` 标记）。

### D3: 通知内容安全

**背景**：锁屏直接露出消息正文有隐私风险。

**结论**：用户可通过设置 `push_show_preview = false` 关闭正文预览，通知只显示"发来一条消息"。

### D4: 登出时清理订阅

**背景**：用户登出后，旧的订阅会持续收到推送。

**结论**：`teardownPushOnLogout()` 先捕获当前 token，再异步取消订阅，防止新登录的 token 竞态覆盖。

## 已知限制（接受不修）

### L1: iOS PWA 推送行为不一致

- iOS 16.4+ 才支持 PWA 推送
- 必须「添加到主屏幕」后以独立模式打开才有推送
- `client.focused` 在 iOS 上行为不可靠，`shouldCloseAfterShow` 可能误判
- 欧盟部分 iOS 环境 PWA 推送能力曾被削弱

### L2: 多进程部署合拼失效

- `coalesceTimers` 是进程内 Map，水平扩展后各进程独立计数
- 同一个用户在不同进程的订阅会收到重复通知
- 当前是单进程部署，不影响

### L3: 好友请求无合拼

- 好友请求是低频操作，不需要合拼
- 但如果恶意用户反复发送/取消好友请求，会触发大量推送
- 未来可考虑对非合拼推送也加频率限制

## 审查记录

### 2026-08-07 第 1 轮审查

| 问题 | 严重度 | 处理 |
|------|--------|------|
| `pushUrlBase()` 本地 dev 返回空字符串 | 🔴 高 | 已补充开发环境变量说明到 README |
| `isUserOnline` 死代码 | 🟡 中 | 已标记为清理项 |
| 推送 endpoint 缺少 URL 格式校验 | 🟢 低 | 已记录，可后续加 |
| 登出时合拼定时器残留 | 🟢 低 | 已记录，可后续加 |
| SW 逻辑无测试 | 🟢 低 | 已记录，可后续补 |

### 2026-08-07 第 2 轮审查

| 问题 | 严重度 | 处理 |
|------|--------|------|
| 部署脚本 `package.json` 中 `deploy` 为空 | 🟢 低 | 已记录到 README |
| delete 路由同时支持 query 可能泄露 endpoint | 🟢 低 | 已记录 |
| 429 未处理 | 🟢 低 | 当前不影响，已记录 |

## 部署环境变量

| 变量 | 默认值 | 必填 | 说明 |
|------|--------|------|------|
| `PORT` | `3001` | ❌ | 服务端口 |
| `HOST` | `127.0.0.1` | ❌ | 监听地址 |
| `JWT_SECRET` | 开发有默认值 | ✅ **生产必填** | JWT 签名密钥 |
| `DB_PATH` | `server/data/geo-contacts.db` | ❌ | SQLite 路径 |
| `VAPID_PUBLIC_KEY` | 无 | ⚠️ 推送必填 | Web Push 公钥 |
| `VAPID_PRIVATE_KEY` | 无 | ⚠️ 推送必填 | Web Push 私钥 |
| `VAPID_SUBJECT` | `mailto:admin@localhost` | ❌ | VAPID subject |
| `PUBLIC_PATH_PREFIX` | 无 | ⚠️ **子路径部署必填** | 通知深链前缀，如 `/geo-contacts` |
| `CORS_ORIGIN` | 开发放行 | ❌ | 生产跨域白名单 |

> ⚠️ **注意**：`PUBLIC_PATH_PREFIX` 在本地开发时务必设置，否则通知点击跳转链接会缺少 `/geo-contacts/` 前缀，导致 404。`VITE_BASE` 是构建时变量，不会被 Node.js 运行时读取。
>
> 本地开发命令：
> ```bash
> PUBLIC_PATH_PREFIX=/geo-contacts npm run dev
> ```