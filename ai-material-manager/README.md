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

## AI 助手接入（MCP + Skill）与预发布

- 用户在网页“更多 → AI 助手接入”创建个人访问令牌（30/90/180 天，每人最多 10 个，可随时吊销），把生成的配置粘贴到 Codex / Claude Code / Claude 桌面版 / Cursor 等支持远程 MCP 的助手，并下载 Skill 操作手册。
- 非访客第一次打开系统时自动播放“Codex 接入教程”（五步动画：创建令牌 → 写入 `~/.codex/config.toml` → `/mcp` 验证 → 安装 Skill 到 `~/.codex/skills/` → 一句话预发布）；关闭后收进顶栏的机器人图标（手机端为右下角浮动图标），随时可重看。是否看过记在浏览器 `localStorage` 的 `app.agent-tutorial-seen`，只影响首次自动弹出。
- MCP 服务地址 `https://<域名>/mcp`（Streamable HTTP，无状态，`Authorization: Bearer <令牌>`）。每次请求按令牌主人新建实例，权限与网页一致；访客不能创建令牌。
- 令牌带 HMAC 签名，服务端只在 `$AGENT_DATA_DIR/tokens.json`（默认 `$UPLOAD_DIR/agent`，位于持久化上传卷内）保存编号、到期与吊销状态，不保存明文。更换 `SESSION_SECRET` 会使全部令牌失效。
- 文件上传：`prepare_upload` 签发 2 小时有效、绑定用户的上传链接，并给出 bash / PowerShell 命令；32MB 以内一次 `PUT`，更大的文件按 32MB 分片（低于 Cloudflare 单请求 100MB 上限），收齐后与网页上传走同一条转存飞书链路。下载同理签发 30 分钟有效的链接。
- **快速通道（预发布）**：用户本机的 AI 完成识别命名、标记后调用 `publish_material`，服务端几秒内依次写主表（先“待发布”）→ 版本记录（审核状态=待审核）→ 发布记录 → 主表置“已发布 + 预发布”，**不经过 TClaw**。版本替换时同时连上“替代的旧版本”，由多维表格自动化立即下架旧版并通知。任一步失败会删除本次已建记录。
- 预发布物料所有人可正常下载，列表与详情带“预发布”标记；该物料的“策划及审核人”（或维护者）在待办或详情页点“审核通过”转正式发布，或写明原因“驳回”（下架，上传者在待办看到原因）。
- 网页上传仍走 AI 待处理池 + TClaw 原流程。
- 主表新增字段：`预发布`（复选框）、`审核意见`（文本）。

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
