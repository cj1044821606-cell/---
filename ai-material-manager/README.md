# AI 物料版本管理系统

**全文摘要：** 该版本已将原妙搭 React + NestJS 应用改造为可独立运行的飞书应用：用飞书 OAuth 登录，通过官方 Node SDK 实时读写 Base，并可用 Docker 部署到 Google Compute Engine。

**预估阅读时间：** 6 分钟

## 架构

`React SPA -> NestJS -> @larksuiteoapi/node-sdk -> Feishu Base / Drive`

- 业务数据仍以原 11 张 Base 表为唯一事实源，不复制到 Postgres。
- `POST /records/search` 分页读取，服务端有 4 秒短缓存、请求合并和同表串行写队列；本应用的写入会立即失效缓存。物料库由前端先显示缓存，再请求新数据，每 60 秒及窗口重新聚焦时检查刷新；失败时明确标记缓存可能过期，不叠加服务端旧快照。
- Base 附件只保存 `file_token`，预览与下载经过绑定登录人的签名后端代理。
- 物料卡片与详情大图使用 `/api/files/thumb` 缩略图：原图只从飞书下载一次，用 sharp 压成 480px / 1200px WebP 存到 `THUMB_CACHE_DIR`（默认 `$UPLOAD_DIR/thumbs`）。缓存键是 `file_token`，附件换新版本即生成新图；URL 不含过期时间，浏览器按 `immutable` 缓存一年。列表接口返回后会在后台预热本次筛选结果的缩略图。
- 前端静态资源带内容哈希，`/assets/*` 永久缓存，`index.html` 每次校验；页面按路由拆包并在空闲时预取。
- 前端用 TanStack Query 共享身份、系统配置、物料列表等数据，物料库数据持久化到 `localStorage`（退出登录、会话失效、换账号时清空），再次打开先秒开缓存再后台刷新。
- 小文件使用 `upload_all`，大于 20MB 的文件使用 4MB 分片上传。临时文件与进度保存在 `UPLOAD_DIR`。
- `lark-cli` 只用于开发核验和运维，不在普通用户请求链路中运行。

## 预览与人员搜索

- 无图片预览时，从 M/S 中的 PDF 提取第一页，使用 Poppler `pdftoppm` 后转 WebP；不读取受限的 L 源文件来生成公共预览。单 PDF 上限 80MB，渲染超时 30 秒，超限或损坏时退回类型占位。
- 下载的 PDF 仅用于临时转换，成功或失败均在 `finally` 删除；重启只清理本服务命名的中断 PDF 临时文件。飞书原文件不会删除。WebP 小图会保留在持久缓存中，仍需监控长期磁盘用量。
- 文件按 M 导出件、L 源文件、S 预览图分组；仅当同层文件名唯一且完全匹配时，将云盘入口折叠为同名云盘副本。RGB/CMYK 用途根据文件名标注，不代表已检测实际色彩空间；不合并不明确的文件，不删除业务附件。
- 人员选择默认推荐身份表人员，输入姓名后通过飞书 Directory 搜索应用通讯录权限范围内的员工；选中员工不会自动授予系统角色。
- 飞书应用需开通并发布 `directory:employee:search` 和 `directory:employee.base.name.name:read`（或覆盖该字段的权限）。头像与部门为可选字段。服务端明确使用 `open_id`，保留分页和权限失败提示。
- 本机测试 PDF 预览需安装 Poppler；Docker 与 GitHub CI 已包含该依赖。

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
