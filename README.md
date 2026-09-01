# AI 物料版本管理系统

**全文摘要：** 本仓库统一管理 AI 物料版本管理系统的自托管 Web 应用、TClaw 规则与配套运维脚本。业务数据仍以飞书多维表格为唯一事实源，代码变更通过 Issue、分支、Pull Request、自动检查和可回退发布版本完成。

**预估阅读时间：** 4 分钟

## 仓库结构

| 路径 | 用途 |
|---|---|
| `ai-material-manager/` | React 19 + NestJS 自托管应用 |
| `tclaw/TClaw现状/` | TClaw 当前生效规则的本地真相源 |
| `tclaw/scripts/` | 云盘归档、同步和运行维护脚本 |
| `reusable/` | 可复用的飞书处理工具 |
| `ai_material_version_manager_handoff.md` | 历史架构与业务交接材料 |

测试素材、上传文件、构建产物、ZIP、环境变量和本机运行目录不会进入 Git。

## 开发流程

1. 先创建 GitHub Issue，写清问题、真实数据证据和验收标准。
2. 从 `main` 创建短分支，例如 `fix/upload-person-selector`。
3. 完成功能与测试，在 `ai-material-manager/` 执行 `npm run verify`。
4. 创建 Pull Request，说明 Base 字段、工作流、TClaw 和部署影响。
5. GitHub Actions 全部通过并完成评审后合并。
6. 部署后验证 `/healthz`、真实飞书登录和关键 Base 回读，再创建版本标签。

详细约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 本地验证

```bash
cd ai-material-manager
npm ci
npm run verify
docker build -t ai-material-manager:local .
```

## 生产地址

- Web 应用：<https://materials.caojunaimcp.com>
- 运行平台：Google Compute Engine + Docker + Cloudflare Tunnel
- 业务数据：飞书 Base `AI物料版本管理系统`

任何密钥只保存在开发机或服务器环境变量中，不提交到 GitHub。

