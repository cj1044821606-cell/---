# AI 物料版本管理系统

**全文摘要：** 该版本已将原妙搭 React + NestJS 应用改造为可独立运行的飞书应用：用飞书 OAuth 登录，通过官方 Node SDK 实时读写 Base，并可用 Docker 部署到 Google Compute Engine。

**预估阅读时间：** 6 分钟

## 架构

`React SPA -> NestJS -> @larksuiteoapi/node-sdk -> Feishu Base / Drive`

- 业务数据仍以原 11 张 Base 表为唯一事实源，不复制到 Postgres。
- `POST /records/search` 分页读取，服务端有 4 秒短缓存、请求合并和同表串行写队列。
- Base 附件只保存 `file_token`，预览与下载经过绑定登录人的签名后端代理。
- 小文件使用 `upload_all`，大于 20MB 的文件使用 4MB 分片上传。临时文件与进度保存在 `UPLOAD_DIR`。
- `lark-cli` 只用于开发核验和运维，不在普通用户请求链路中运行。

## 本地开发

1. 复制 `.env.example` 的字段到 `.env.local`，真实 App Secret 只保存在本机。
2. 执行 `npm install`。
3. 执行 `npm run dev`，前端默认为 `http://localhost:8080`，后端默认为 `http://localhost:3000`。
4. 本地可访问 `/api/auth/dev-login`并使用 `DEV_USER_OPEN_ID` 模拟当前人。生产环境不暴露该入口。

## 验证命令

```bash
npm run type:check
npm run lint
npm test -- --runInBand
npm run build:prod
docker build -t ai-material-manager:latest .
```

## Google VM 部署

1. 在 Google Cloud 建立 Ubuntu 24.04、`e2-medium`、30GB 持久磁盘的专用 VM。
2. 将本项目放到 `/opt/ai-material-manager`，在目录内执行 `sudo bash deploy/install-vm.sh`。
3. 在 VM 直接创建 `.env.production`，不要经聊天或 zip 传递 App Secret。
4. 将本机 `~/.cloudflared/2ea7a46a-ad49-4b72-87df-11d72b54210a.json` 通过受控通道放到 VM 的 `deploy/cloudflared/credentials.json`，权限设为 `600`。不要把它提交到代码库。
5. 执行 `sudo systemctl start ai-material-manager`，然后检查 `docker compose ps` 和 `curl http://127.0.0.1:3000/healthz`。

## 飞书后台设置

- 网页应用桌面端/移动端首页：`https://materials.caojunaimcp.com/library`
- OAuth 回调：`https://materials.caojunaimcp.com/api/auth/callback`
- 应用可用范围：切换前与现有妙搭版保持一致
- 发布新版本后，分别在飞书桌面端、移动端和普通浏览器完成登录验证。

## 切换原则

新旧版共用同一个 Base，不迁移业务记录。新域名隐藏验收通过后，一次性修改飞书工作台入口；妙搭旧版仅保留跳转和短期回退能力。
