# 储能事业部访问权限与分享链接 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**全文摘要：** 分 8 个任务实现设计文档。先做部门判断服务和身份口径，再做全局访问拦截和各处权限消费方，接着是运维告警、前端无权限页与教程条件、分享链接按钮，最后是飞书后台权限生效后的配置写入与部署。**预估阅读时间：** 8 分钟。

**Goal:** 储能事业部全员可打开并下载已发布物料，市场部及人员表上传角色可上传，MCP 教程只对能上传的人自动弹出，物料可一键复制内部分享链接。

**Architecture:** 新增 `DepartmentService` 通过飞书通讯录 v3 接口取用户部门和上级链，与系统配置表中的部门 ID 求交集；`IdentityService` 据此输出 `accessState` / `inDivision` / `inMarketing` / `isDivisionMember`。`NeedLogin` 统一叠加 `DivisionAccessGuard`，前端按身份字段渲染无权限页。分享改为复制站内详情页链接。

**Tech Stack:** NestJS + `@larksuiteoapi/node-sdk`、React 19 + TanStack Query、Jest（`server/**/*.spec.ts`、`test/unit/**/*.spec.ts`）。

**Spec:** `ai-material-manager/docs/superpowers/specs/2026-10-16-division-access-and-share-design.md`

## Global Constraints

- 所有路径都相对于 `ai-material-manager/`；在分支 `feat/division-access-share` 上提交；每个任务结束都要跑 `npm run type:check && npm run lint && npx jest`，全部通过才提交（提交钩子也会跑）。
- 配置键：`access_department_ids`（储能事业部）、`upload_department_ids`（市场部）；文本值里多个 `open_department_id` 用逗号分隔。
- 通讯录接口统一传 `user_id_type=open_id`、`department_id_type=open_department_id`，以应用（tenant）身份调用。
- 缓存时长：用户部门链 30 分钟；部门 → 上级链 6 小时；身份 10 分钟（沿用现值）。失败结果一律不写缓存。
- 错误码与文案：403 `{ code: "NOT_IN_DIVISION", message: "本系统仅对储能事业部开放" }`；503 `{ code: "DEPARTMENT_UNAVAILABLE", message: "暂时无法验证部门，请稍后重试" }`。
- 源文件 L 的可见角色不变：设计师 / 策划 / 维护者。
- 分享链接：`${window.location.origin}/material/${encodeURIComponent(baseRecordId)}`；复制成功提示“已复制，储能事业部同事打开即可查看”，并附一句“对外请先确认允许外发”。
- 不改动任何 Base 表结构和工作流；只在 Task 8 往系统配置表新增两条记录。

## Review Focus

1. 一个人同时挂在事业部内外两个部门 → 应判定为事业部成员（Task 1 测试 `一人多部门只要一个命中即为成员`）。
2. 部门接口失败时，人员表里的人不能被挡在门外，失败结果也不能被身份缓存住 10 分钟（Task 2 测试 `部门验证失败时人员表用户放行且不缓存身份`）。
3. 运维在配置里填了空格、换行或多余逗号 → 照样能解析（Task 1 测试 `配置值容忍空格换行与多余逗号`）。
4. 已签发 MCP 令牌的人离开事业部 → 下一次请求就被拒，而不是等令牌过期（Task 4 测试 `令牌主人失去访问权后 MCP 请求被拒`）。
5. 部门配置还没写入时上线代码 → 现有用户行为完全不变，访客仍按“全球 + 可外发”规则看物料（Task 2 测试 `部门未配置时退回人员表口径`）。

---

### Task 1: DepartmentService —— 部门链与配置解析

**Files:**
- Create: `server/modules/identity/department.service.ts`
- Create: `server/modules/identity/department.service.spec.ts`
- Modify: `server/modules/identity/identity.module.ts`（providers / exports 加 `DepartmentService`）

**Interfaces:**
- Consumes: `FeishuService.client`（`contact.v3.user.get`、`contact.v3.department.parent`），`FeishuBaseGateway.rows("config")`（字段 `key`、`textValue`、`enabled`），`CACHE_MANAGER`。
- Produces:
  - `export function parseDepartmentIds(raw: string | null | undefined): string[]`：按 `[,，\s]+` 切分、去空、去重。
  - `export type DepartmentCheck = { state: "ok"; inDivision: boolean; inMarketing: boolean } | { state: "unconfigured" } | { state: "failed"; reason: string }`
  - `DepartmentService.check(openId: string): Promise<DepartmentCheck>`
  - `DepartmentService.configStatus(): Promise<{ accessIds: string[]; uploadIds: string[] }>`（给运维用）

- [ ] **Step 1: 写失败测试** `department.service.spec.ts`，用 jest mock `client` 和 `base`：
  - `配置值容忍空格换行与多余逗号`：`parseDepartmentIds(" od-a，od-b\n,od-a, ")` → `["od-a","od-b"]`；`parseDepartmentIds(null)` → `[]`。
  - `多层嵌套命中事业部与市场部`：用户部门 `od-team`，上级链 `od-mkt → od-ess → od-root`，配置 access=`od-ess`、upload=`od-mkt` → `{state:"ok", inDivision:true, inMarketing:true}`。
  - `一人多部门只要一个命中即为成员`：部门 `[od-other, od-team]`，只有 `od-team` 在事业部下 → `inDivision:true`。
  - `事业部内非市场部`：上级链不含 `od-mkt` → `inMarketing:false`。
  - `未配置访问部门返回 unconfigured`：`access_department_ids` 记录不存在或为空 → `{state:"unconfigured"}`，且不调用通讯录接口。
  - `接口权限不足返回 failed 且不缓存`：`user.get` 返回 `code: 99991672` → `state:"failed"`；第二次调用会再次请求接口（mock 调用次数为 2）。
  - `偶发失败重试一次`：第一次抛错、第二次成功 → `state:"ok"`。
  - `部门链被缓存`：同一 openId 连续两次 `check`，`user.get` 只调用 1 次。
- [ ] **Step 2: 运行测试确认失败**：`npx jest server/modules/identity/department.service.spec.ts`，预期因找不到模块而 FAIL。
- [ ] **Step 3: 实现 `DepartmentService`**：配置从 `config` 表读取（复用网关缓存，不另加缓存）；用户部门链缓存键 `dept:user:v1:<openId>`（30 分钟），部门上级链缓存键 `dept:parents:v1:<deptId>`（6 小时）；`department.parent` 需要分页，用 `page_token` 循环取完；`code !== 0` 视为失败；整次 `check` 失败时只重试 1 次，失败结果不写缓存。
- [ ] **Step 4: 运行测试确认通过**：同上命令，预期全部 PASS。
- [ ] **Step 5: 提交**：`git add server/modules/identity && git commit -m "feat: 部门链查询与部门配置解析"`

### Task 2: 身份口径扩展

**Files:**
- Modify: `shared/identity.ts`（`Identity` 增加字段）
- Modify: `server/modules/identity/identity.service.ts`
- Create: `server/modules/identity/identity.service.spec.ts`

**Interfaces:**
- Consumes: Task 1 `DepartmentService.check(openId)`。
- Produces（`Identity` 新增字段）：
  - `accessState: "granted" | "denied" | "unverified"`
  - `canAccess: boolean`（`accessState === "granted"`）
  - `inDivision: boolean`、`inMarketing: boolean`
  - `isDivisionMember: boolean`（`inDivision && isVisitor`）
  - `isUploadRole` 口径改为 `inMarketing || 角色含 策划/设计师/区域营销`

- [ ] **Step 1: 写失败测试** `identity.service.spec.ts`（mock 网关 `people` / `region` 行、`DepartmentService`、内存 cache）：
  - `事业部内未录表用户可访问且看全部`：无人员行 + `{ok, inDivision:true, inMarketing:false}` → `accessState:"granted"`、`isVisitor:true`、`isDivisionMember:true`、`isUploadRole:false`。
  - `市场部未录表用户可上传`：`inMarketing:true` → `isUploadRole:true`。
  - `事业部外未录表用户被拒`：`{ok, inDivision:false}` 且无人员行 → `accessState:"denied"`。
  - `事业部外但在人员表的销售可访问`：人员行“销售”、`inDivision:false` → `granted`、`isUploadRole:false`。
  - `部门未配置时退回人员表口径`：`{state:"unconfigured"}` + 无人员行 → `granted`、`isDivisionMember:false`、`isUploadRole:false`（与现行访客一致）。
  - `部门验证失败时人员表用户放行且不缓存身份`：`{state:"failed"}` + 人员行“设计师” → `granted`；无人员行 → `unverified`。两种情况下第二次 `resolve` 都会再次调用 `check`（身份没有被缓存）。
  - `成功结果缓存 10 分钟`：`granted` 后第二次 `resolve` 不再调用 `check`。
- [ ] **Step 2: 运行测试确认失败**：`npx jest server/modules/identity/identity.service.spec.ts`。
- [ ] **Step 3: 实现**：`IdentityService` 构造函数注入 `DepartmentService`；缓存键升级为 `identity:v4:`；只有 `accessState !== "unverified"` 且部门状态不是 `failed` 时才写缓存。访客分支同样补齐新字段。
- [ ] **Step 4: 运行测试确认通过**，再跑 `npm run type:check`，修好前端因 `Identity` 新字段导致的类型报错（只补字段，不改行为）。
- [ ] **Step 5: 提交**：`git commit -m "feat: 身份按部门判定访问与上传权限"`

### Task 3: 全局访问拦截

**Files:**
- Create: `server/common/auth/division-access.guard.ts`
- Create: `server/common/auth/division-access.guard.spec.ts`
- Modify: `server/common/auth/need-login.decorator.ts`（`NeedLogin = UseGuards(SessionAuthGuard, DivisionAccessGuard)`；新增 `NeedSession = UseGuards(SessionAuthGuard)`）
- Modify: `server/modules/identity/identity.controller.ts`、`server/modules/auth/auth.controller.ts`（`me` / `logout`）改用 `NeedSession()`
- Modify: `server/modules/identity/identity.module.ts`（加 `@Global()`，让各模块的守卫都能注入 `IdentityService`）

**Interfaces:**
- Consumes: Task 2 的 `Identity.accessState`。
- Produces: `DivisionAccessGuard.canActivate(ctx): Promise<boolean>`；拒绝时抛 `ForbiddenException({ code: "NOT_IN_DIVISION", message })` / `ServiceUnavailableException({ code: "DEPARTMENT_UNAVAILABLE", message })`。

- [ ] **Step 1: 写失败测试**：`granted` → true；`denied` → 403 且 `response.code === "NOT_IN_DIVISION"`；`unverified` → 503 且 `code === "DEPARTMENT_UNAVAILABLE"`。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 实现守卫和两个装饰器**；`/api/identity`、`/api/auth/me`、`/api/auth/logout` 只要求登录，这样前端才能拿到 `accessState` 来渲染无权限页。下载代理沿用 `NeedLogin`，因此也会多一道部门检查。签名本来就只发给有权限的人，多这一道无害，不做特殊处理（与设计第 4 节“不必拦截”的意图一致）。
- [ ] **Step 4: 跑全部测试**：`npx jest`，并启动本地预览确认 Nest 依赖注入无报错（`/healthz` 返回 200）。
- [ ] **Step 5: 提交**：`git commit -m "feat: 非储能事业部用户统一拦截"`

### Task 4: 权限消费方改口径

**Files:**
- Modify: `server/modules/materials/materials.service.ts`（`isMaterialVisible`：`identity.isDivisionMember` 与总部同等对待）
- Modify: `server/modules/materials/materials.version-files.spec.ts` 或新建 `materials.visibility.spec.ts`
- Modify: `server/modules/agent/agent.controller.ts`（签发令牌由 `isVisitor` 改为要求 `canAccess`）
- Modify: `server/modules/agent/mcp.controller.ts`（令牌认证通过后 `identity.resolve`；不是 `granted` 时返回 JSON-RPC 错误，文案取 Global Constraints 中的错误文案）
- Modify: `server/modules/identity/people.service.ts`（组织搜索由 `isVisitor` 改为 `!canAccess` 时拒绝）
- Modify: `server/modules/agent/mcp.e2e.spec.ts`

**Interfaces:**
- Consumes: Task 2 字段。
- Produces: 无新接口。

- [ ] **Step 1: 写失败测试**：
  - `事业部成员看到非全球非外发物料`：`isDivisionMember:true`、物料区域 `["AF"]`、`allowExternalSend:false`、已发布 → 可见。
  - `传统访客仍只看全球可外发`：`isVisitor:true, isDivisionMember:false` → 同一物料不可见。
  - `令牌主人失去访问权后 MCP 请求被拒`：e2e 中 identity mock 改为返回 `accessState:"denied"`，`tools/list` 收到错误，文案含“储能事业部”。
  - `事业部成员可签发令牌`：`isVisitor:true, canAccess:true` 时签发成功。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 实现上述四处改动**，L 源文件判断（`canSeeSourceFiles`）保持不变。
- [ ] **Step 4: 运行测试确认通过**。
- [ ] **Step 5: 提交**：`git commit -m "feat: 物料可见性、MCP 与组织搜索按事业部口径"`

### Task 5: 运维告警

**Files:**
- Modify: `shared/ops.ts`（新增 `OpsDepartmentAlert { status: "ok" | "unconfigured" | "failed"; accessCount: number; uploadCount: number }`，`OpsResponse.departmentAlert`）
- Modify: `server/modules/ops/ops.service.ts`
- Modify: 运维页展示组件（`client/src/pages/more/` 中展示 `qrAlert` 的那个组件，紧挨着二维码告警渲染）

**Interfaces:**
- Consumes: Task 1 `configStatus()`、`check(当前运维用户 openId)`。
- Produces: `OpsResponse.departmentAlert`。

- [ ] **Step 1: 写失败测试**（`server/modules/ops/ops.service.spec.ts`）：未配置 → `unconfigured`；配置存在但检查失败 → `failed`；正常 → `ok`，同时返回配置的部门 ID 数量。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 实现**；前端文案：`unconfigured`“部门权限未配置，目前只按人员表放行”，`failed`“部门信息读取失败，请检查飞书通讯录权限”，`ok` 不显示。
- [ ] **Step 4: 运行测试确认通过**。
- [ ] **Step 5: 提交**：`git commit -m "feat: 运维页显示部门权限状态"`

### Task 6: 前端无权限页与教程条件

**Files:**
- Create: `shared/access.ts`
- Create: `test/unit/access.spec.ts`
- Create: `client/src/pages/NoAccessPage.tsx`
- Modify: `client/src/components/Layout.tsx`（教程自动弹出改用 `shouldAutoShowAgentTutorial`；`canUseAgent` 改为 `identity.canAccess`；`accessState !== "granted"` 时整页渲染 `NoAccessPage`）
- Modify: `client/src/pages/more/MorePage.tsx`（`canUseAgent` 同上）
- Modify: `client/src/lib/api-client.ts`（响应码为 403 且 `code === "NOT_IN_DIVISION"`，或 503 且 `code === "DEPARTMENT_UNAVAILABLE"` 时，让身份查询失效重取；不跳转登录）

**Interfaces:**
- Consumes: Task 2 字段。
- Produces（`shared/access.ts`）：
  - `shouldAutoShowAgentTutorial(identity: Pick<Identity,"canAccess"|"isUploadRole">, seen: boolean): boolean`
  - `accessBlock(identity: Pick<Identity,"accessState">): null | "notInDivision" | "unverified"`

- [ ] **Step 1: 写失败测试** `test/unit/access.spec.ts`：
  - 能上传且未看过 → true；能上传但已看过 → false；销售（`isUploadRole:false`）→ false；`canAccess:false` → false。
  - `accessBlock`：`granted` → null；`denied` → `"notInDivision"`；`unverified` → `"unverified"`。
- [ ] **Step 2: 运行测试确认失败**：`npx jest test/unit/access.spec.ts`。
- [ ] **Step 3: 实现** `shared/access.ts` 和 `NoAccessPage`。文案：
  - `notInDivision`：标题“暂无访问权限”，正文“本系统仅对储能事业部开放。如需使用，请联系系统维护者。”
  - `unverified`：标题“暂时无法验证部门”，正文“请稍后刷新重试。”
  - 两种情况都提供“退出登录”按钮（POST `/api/auth/logout` 后跳转 `/api/auth/login`）；中英文都要有。
- [ ] **Step 4: 运行测试确认通过**；本地预览确认本人账号正常进入，销售类账号用 `DEV_USER_OPEN_ID` 无法模拟时，就以测试结果为准，并在 PR 里说明。
- [ ] **Step 5: 提交**：`git commit -m "feat: 无权限页与 MCP 教程仅对可上传用户自动弹出"`

### Task 7: 复制分享链接

**Files:**
- Create: `shared/share.ts`
- Create: `test/unit/share.spec.ts`
- Create: `client/src/components/ShareLinkButton.tsx`
- Modify: `client/src/pages/material/MaterialDetailPage.tsx`（用 `ShareLinkButton` 替换原“分享给客户”按钮与 `ShareDialog`）
- Modify: `client/src/pages/library/MaterialCard.tsx`（右上角图标按钮，`variant="icon"`；`event.stopPropagation()` 防止跳转详情；桌面端悬停时显示，手机端常显）
- Modify: `client/src/pages/material/material-detail-i18n.ts`、`client/src/pages/library/library-i18n.ts`（新增文案、删除 `share.*` 旧文案）
- Delete: `client/src/pages/material/ShareDialog.tsx`（单文件删除）

**Interfaces:**
- Produces（`shared/share.ts`）：
  - `buildMaterialShareUrl(origin: string, baseRecordId: string): string`
  - `copyText(text: string, clipboard: { writeText(t: string): Promise<void> } | undefined): Promise<boolean>`（不抛错，失败返回 false）
- `ShareLinkButton` props：`{ materialId: string; variant: "button" | "icon" }`；复制失败时弹出带只读输入框的对话框，并自动全选链接文字。

- [ ] **Step 1: 写失败测试** `test/unit/share.spec.ts`：
  - `buildMaterialShareUrl("https://materials.caojunaimcp.com", "recA")` → `"https://materials.caojunaimcp.com/material/recA"`；origin 带结尾 `/` 时不出现 `//material`；ID 中的 `/` 会被编码。
  - `copyText` 剪贴板成功 → true；`writeText` 拒绝 → false；clipboard 为 `undefined` → false。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 实现** `shared/share.ts`、`ShareLinkButton`，并完成两处接入；按钮文案“复制分享链接 / Copy link”，图标用 lucide `Link2`；提示文案按 Global Constraints。
- [ ] **Step 4: 运行测试确认通过**；本地预览检查桌面和 375px 手机：详情页按钮和卡片图标都能复制，且点卡片图标不会跳转到详情页。
- [ ] **Step 4b: 不可见物料的空状态**：用一个不存在的 ID 打开 `/material/recNotExist`，确认显示“物料不存在”空状态，并带“去物料库”按钮（链接 `/library`）；没有的话在 `MaterialDetailPage.tsx` 的 404 分支补上。
- [ ] **Step 5: 提交**：`git commit -m "feat: 物料复制分享链接"`

### Task 8: 部门配置写入与上线（依赖飞书后台权限已发布）

**Files:**
- Modify: `README.md`（新增“访问权限”一节：规则表、两个配置键、运维告警含义）
- Modify: `../CHANGELOG.md`

- [ ] **Step 1: 确认权限已生效**：用 `lark-cli api GET /open-apis/contact/v3/users/<曹钧 open_id> --params '{"user_id_type":"open_id","department_id_type":"open_department_id"}' --as bot` 取回非空 `department_ids`，再逐级调用 `departments/parent` 打印部门名称链。预期能在链上看到“储能事业部”和“市场部”；如果看不到，停下来请用户检查通讯录权限范围。
- [ ] **Step 2: 和用户确认两个部门 ID 及名称**（只读展示，等用户确认后再写）。
- [ ] **Step 3: 写入系统配置表**两条新记录：`配置键` 分别为 `access_department_ids` / `upload_department_ids`，`配置名称` 分别为“可访问部门（储能事业部）”/“可上传部门（市场部）”，`文本值` 填部门 ID，`是否启用` = true。写完用 `+record-list` 回读确认。
- [ ] **Step 4: 文档与 PR**：更新 README / CHANGELOG，推送分支，开 PR，等 CI 全绿。
- [ ] **Step 5: 合并部署**：按项目惯例（squash 合并 → 精确提交归档传到 VM → 构建候选镜像 → 备用端口 `/healthz` → 打回退标签 `rollback-before-<sha>` → 只重建 `app`）。
- [ ] **Step 6: 线上核验**：本人账号 `/api/identity` 返回 `inDivision:true`、`inMarketing` 符合实际；物料库条数不少于部署前；运维页没有部门告警；在飞书里打开一条分享链接，未登录时登录后能回到该物料。
