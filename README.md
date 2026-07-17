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
| `JWT_SECRET` | 开发默认值 | 生产环境务必修改 |
| `DB_PATH` | `server/data/geo-contacts.db` | SQLite 数据库路径 |

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

## 后续计划

- 好友资料地图叠加显示
- 高德地图切换
- 消息通知 / 好友动态
- Capacitor 原生壳与手机通讯录直读
