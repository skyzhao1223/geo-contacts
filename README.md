# GeoContacts 地理通讯录

跨平台 Web/PWA + 后端服务，用于管理联系人籍贯、出生地、现居地，在地图上查看分布，并支持用户账号、好友关系与在线状态。

## 功能

### 本地通讯录
- 本地存储（IndexedDB），联系人数据保留在设备端
- 导入 vCard (.vcf)、CSV、JSON 备份
- 导出 JSON / CSV / vCard
- 联系人合并去重
- 地图查看出生地 / 籍贯 / 现居地分布

### 用户与好友
- 邮箱注册 / 登录
- 搜索平台用户并发送好友请求
- 好友在线 / 离线状态（WebSocket 实时同步）
- 将平台好友「关联到通讯录」，联系人会显示在线状态
- 用户资料支持填写出生地、籍贯、现居地

## 开发

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173
- 后端 API / WebSocket：http://localhost:3001

## 生产部署

```bash
npm run build
npm start
```

生产模式下由 `server/index.ts` 同时提供 API 和前端静态资源。

### 挂到 zhaosky.cn / aws-infra-dashboard

站点子路径为 `/geo-contacts/`（nginx 会剥离前缀反代到本服务）：

```bash
npm run build:site          # VITE_BASE=/geo-contacts/
PORT=3010 npm start
```

本地联调 aws-infra 网关：

```bash
# 终端 1
cd ../geo-contacts && npm run build:site && PORT=3010 npm start

# 终端 2
cd ../aws-infra-dashboard && npm run dev:stack
# 打开 http://localhost:8080/geo-contacts/
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务端口 |
| `HOST` | `127.0.0.1` | 监听地址 |
| `JWT_SECRET` | 仅开发有默认值 | **生产必须设置**，否则进程退出 |
| `CORS_ORIGIN` | 开发放开 / 生产同域 | 逗号分隔的跨域白名单；同域托管静态资源时可不设 |
| `DB_PATH` | `server/data/geo-contacts.db` | SQLite 数据库路径 |
| `VAPID_PUBLIC_KEY` | 无 | Web Push 公钥；与私钥成对，缺则推送降级关闭 |
| `VAPID_PRIVATE_KEY` | 无 | Web Push 私钥 |
| `VAPID_SUBJECT` | `mailto:admin@localhost` | VAPID subject，建议 `mailto:` 或 HTTPS URL |
| `PUBLIC_PATH_PREFIX` | 无 / 跟 `VITE_BASE` | 通知深链前缀，如 `/geo-contacts`（无尾斜杠） |

生成 VAPID 密钥：

```bash
npx web-push generate-vapid-keys
```

```bash
NODE_ENV=production JWT_SECRET=your-secret \
  VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com \
  PUBLIC_PATH_PREFIX=/geo-contacts \
  npm start
# 若前后端分域：CORS_ORIGIN=https://example.com
```

## 使用流程

1. 注册账号并登录
2. 在「好友」页搜索用户、发送/接受好友请求
3. 点击「关联通讯录」把平台好友同步到本地联系人
4. 导入手机通讯录（vCard）并与平台好友合并去重
5. 补充籍贯 / 出生地 / 现居地
6. 在地图页查看分布，关联用户会显示在线状态

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind + Dexie + Leaflet + PWA
- 后端：Express + SQLite + JWT + WebSocket

## 测试

```bash
npm test
```

## 计划与路线图

详见 [PLAN.md](./PLAN.md)，包含：
- PWA + Web Push 实施计划（已完成）
- 后续阶段（Capacitor、国内推送、地理编码）
- 关键决策记录与已知限制
