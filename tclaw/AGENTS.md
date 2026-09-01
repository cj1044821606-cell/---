# TClaw · AI 物料版本经理 — 运行总纲（本地版 · 接手必读）

> TClaw 是运行在公司云 VM（TranAI 托管 K8s 容器，OpenClaw 类）上的智能体，通过 `lark-cli` 以飞书自建应用身份操作多维表格，担任「AI 物料版本经理」。人格见 [persona.md](persona.md)。
> **本文件是本地仓库给后续接手 AI 的总纲**；TClaw VM 工作区另有一份运行副本（快照见 [TClaw现状/](TClaw现状/)），两边须保持对齐，**以 VM 运行副本和多维表格现状为准**。

## 0. 接手者三分钟上手

- **系统一句话**：飞书多维表格为单一事实源（SSOT），TClaw 做识别/命名/追问/写表/通知，人只确认关键动作。
- **SSOT base**：`AI物料版本管理系统`，base_token `DPCCbp65waiDtys1JfucMKm8nTe`（transsioner.feishu.cn）。
- **入口**：「AI物料版本管理系统测试群」（chat_id `oc_5be0c3e26f911c0128473257fe220f09`）+ 上传表单。
- **两份在线文档**（2026-07-07 建）：
  - 《结构与维护指南》 https://transsioner.feishu.cn/docx/JNEsdnflBoZpmNxC3locl37rnx1 （架构/表结构/自动化清单/云盘机制/进展/计划/维护）
  - 《使用者操作指南》 https://transsioner.feishu.cn/docx/GxXUdkTMzozC4OxVGfpc2PRznDh （上传者/提确者/维护者三角色）
- **本地关键文件**：`knowledge/多维表格结构.md`（表/字段/自动化 SSOT 镜像）、`knowledge/字段ID映射.json`、`knowledge/命名与编码规则.md`、`skills/物料版本管理/`（统一作业手册）、`scripts/drive-upload/`（云盘上传器全套 + 给TClaw的提示词）。
- **设计文档**：仓库根 `ai_material_version_manager_handoff.md`（原始设计）、`_test/prd_append.md`（实测落地版）。

## 1. 系统

- **数据中枢 = 飞书多维表格（10 张表）**：物料/版本/状态/确认/日志都以记录为准；一切输出落表。表结构与 table_id 见 [knowledge/多维表格结构.md](knowledge/多维表格结构.md)。
- **TClaw = 执行中枢**：读规则库与历史 → 识别/命名/对比/判断 → 写回多维表格 → 人确认关键动作。
- **文件形态 L/M/S**：源文件 L(PSD/AI·不读)、导出 M(PDF/PNG/JPG·据此识别、用户取用)、预览 S。附件文件名 = 标准命名 + `-L|M|S` + 扩展名。
- **人员定义表**(`tblMXYsjBpmnVDyc`)：角色/区域→人员，追问与通知的解析依据。

## 2. 云盘链接分发架构（2026-07 新增 · 重要）

**背景**：多维表格工作流推附件有 30M 上限，超限整条消息失败。方案：所有上传的 M/L/S 都备份到云盘（文件夹 `AI物料版本管理系统-物料库`，token `G0GFf6ENZldQN1dZfIDctTw6nKb`），设「组织内可看」，链接回填表格；发送侧按「是否大文件」分支：小文件推附件、大文件发链接。

- **上传不是 TClaw 干的**：独立脚本 `scripts/drive-upload/drive_uploader.py`（幂等+记录锁）。触发 = TClaw 定时任务 `drive-upload-sweep-wake` 每几分钟跑 `--sweep`，扫「有 M 附件但云盘链接M 为空」的记录补传。收敛保证每条记录最终有链接，可自愈、可补历史。
- **是否大文件 = M/L/S 任一 ≥28M（整组判断）**，由 uploader 打标——因为 12/13 三附件一条消息一起发。
- **新增 8 字段**：待处理池 云盘链接M `fldLszX2bR`/L `fldrzedhhh`/S `fldiAeihiI`、是否大文件 `fldQOUs4Zd`；主表 M `fldYyB8ceL`/L `fldpWbSOzy`/S `fld0yHkFG5`、是否大文件 `fldBwfoqhh`。
- **⛔ 铁律：绝不启动事件监听器**（`start_listener.sh` / `lark-cli event consume`）。飞书一个 app 全局只有一条事件长连接，OpenClaw 自己靠它收群消息；监听器抢占会导致 TClaw 群内失联（2026-07-06 事故实录见《结构与维护指南》）。脚本已加安全闸（需 ENABLE_LISTENER=1）。
- **死链规则**：对已入库记录原地换附件时，必须清空该记录云盘链接 M/L/S + 是否大文件，让 sweep 重传。

## 3. 触发与运行

- **表单/上传**：写入「AI待处理池」→ 自动化 07（`wkfNLwLwVpkKoHFi`）发卡片 @TClaw。**07 的发送者身份必须是多维表格机器人**——改成个人身份会静默发送失败（2026-07-06 实测）。
- **确认卡合并发布（2026-08-12）**：自动化 01 的主按钮是「通过并发布」= `确认结果=通过` + `确认后自动发布(fld2avzfPJ)=true`；次按钮「仅入库」= `确认结果=通过` + `确认后自动发布=false`；TClaw 在确认后先入库，若自动发布为真，必须先跑 `python3 scripts/drive-upload/drive_uploader.py <主表record_id>` 并回读云盘链接，再写发布记录和置主表已发布。
- **群文件**：用户说"上传了新文件"→ 检索本群近 20 分钟附件 → `im +messages-resources-download --message-id … --file-key … --type file`（必带 message_id，只用 file_key 会 400）下载 → 建待处理记录。
- **@触发**：群里 @ 即处理。
- **幂等状态机**：认领记录置「处理锁=是、处理状态=处理中」，完成/挂起释放；失败置「失败」+重试次数，超阈值转人工。
- **主轮询每轮最前**：先跑 `python3 scripts/drive-upload/drive_uploader.py --sweep`。

## 4. 自动化现状（16 条 · 详表见《结构与维护指南》）

启用：01、01.5、04、06、07、7.5、08、09、10、11、12、13、14、15；停用：02、05。
要点：01 已有「通过并发布/仅入库/退回修改」三按钮；01.5 会 @TClaw 继续确认后流程。7.5/08 只同步附件/人员等定稿字段，**不同步云盘链接**；云盘链接由 `drive_uploader.py` 在主表定稿后直接写主表。13 已配「是否大文件」IfElseBranch（大→发新版云盘链接，小→发附件）；**12 的大文件分支仍需 UI 抽查/配置**。

### 用 CLI 改自动化的边界（实测结论）

- `workflow-update` 校验器比 UI 严：消息节点 `content` 必须非空、openLink 按钮必须有 link、**ButtonTrigger 的 `$.trig.record` 引用过不了校验** → 按钮触发类（12、14）只能 UI 改；SetRecordTrigger 类（7.5/08/13…）可 CLI 改。
- IfElseBranch：`children.links` 含 if_true/if_false，**分支体各自 next=null 结束、不要汇合**（汇合处触发记录上下文失效）。
- 改前 `workflow-get` 留档，改后回读验证；update body 需 `client_token/title/status/steps` 全量。

## 5. 铁律

1. 一切落表，附件挂记录。
2. 关键动作（发布/下架/废弃/大版本/参数修正）人工确认。
3. 不臆测；信息不足先追问，只问必要的、一次问清。
4. **处理锁**真用（认领置是/完成置否）防并发。
5. **附件改标准名**：上传 M/L/S 前把本地文件改名为标准文件名再 `record-upload-attachment`（附件字段只能用专用命令），上传后回读验证。
6. **填人员字段**（上传者/策划/审核人/追问对象/修改人），状态通知自动化才发到人。
7. **每条消息末尾给下一步引导(CTA)**。
8. 写表前 `field-list` 确认字段 ID/选项；字段引用一律用 field_id。
9. **不漂移、不空等**：认领后连续推进到下个挂起点；消息讲清当前第几步。
10. **读完必回**：任何读表/处理后必落表+发群消息，严禁读完沉默。
11. **区域照实填**：适用区域是多选，逐个填全，绝不填 GLOBAL 兜底；命名只显示主区域。
12. **入库必建版本记录**并连「关联物料」→主表（否则自动化 10/11 不触发）。
13. **同步交自动化**：7.5/08 负责池→主表同步附件/人员/订阅者等字段；云盘链接由 `drive_uploader.py` 写主表，TClaw 不手写云盘链接，但自动发布前要主动触发上传器并回读验证。

## 6. 命名要点（详见 [knowledge/命名与编码规则.md](knowledge/命名与编码规则.md)）

- 产品物料 `产品型号-物料类型-语言-(区域)-版本号`，例 `IPV-1K612U-Datasheet-En-(PK)-V1.0`。
- 品牌：LOGO `<品牌>-Logo-版本号`；其余 `物料类型-语言-(区域)-版本号`。
- 展会 `(年份)展会名缩写-物料类型-(区域)-版本号`（无语言）。
- 产品型号照搬真实串；物料类型取选项开头英文 token；语言 PascalCase；区域括号市场码、Global 省略；**无年月日，更新只升版本号**。

## 7. 排障速查

| 症状 | 处置 |
|---|---|
| 群里 @TClaw 无反应，后台在岗、定时任务正常 | 收消息长连接断了：`pkill -f 'event consume'` → `lark-cli event stop --all --force` → 重启网关 → @ 验证 |
| 07 卡片不触发但人工 @ 正常 | 先查 07 是否真发出（发送者必须是多维表格机器人、看运行历史），别先怀疑接收端 |
| 大文件发送失败 | 查该记录「是否大文件」是否勾、云盘链接是否已回填、12 的 UI 分支是否已配 |
| 云盘链接缺失 | 手动跑 `--sweep`；查 `/tmp/drive_uploader/uploader.log`；env 的 `DRIVE_FOLDER_TOKEN` 是否在 |
| 附件下载 400 | 群文件必须带 message_id 走 `messages-resources-download`；Base 附件必须用 `record-download-attachment` |
| workflow-update 报 validate error | 见第 4 节 CLI 边界；ButtonTrigger 类去 UI 改 |

## 8. 模型路由固定配置（2026-08-12）

### 8.1 人工聊天 / 关键判断：GPT-5.5 中转站

**目标**：TClaw 的人工聊天、复杂识别、需要 GPT-5.5 质量的关键判断，默认使用 TokenSell 中转站的 `gpt-5.5`，思考档位为 `medium`。

注意：后台定时任务不走这里，见 8.2。这样可以避免 cron / sweep / 巡检长期消耗 TokenSell 额度。

固定状态：

- `agents.defaults.model.primary = tokensell-gpt55/gpt-5.5`
- `agents.defaults.thinkingDefault = medium`
- `agents.list` 只允许保留两个 Agent：`main`、`market-connect-test`
- `market-connect-test.model = tokensell-gpt55/gpt-5.5`
- `models.providers.tokensell-gpt55.baseUrl = https://tokensell.shop/v1`
- `models.providers.tokensell-gpt55.api = openai-completions`
- `models.providers.tokensell-gpt55.models[0].id = gpt-5.5`
- `models.providers.tokensell-gpt55.headers.User-Agent` 必须存在；TokenSell 对无浏览器 UA 的服务端请求可能返回 `403 / error code: 1010`

验证方式：

- TClaw 聊天页新建会话，右下角应显示 `gpt-5.5 · Medium` 或模型为 `gpt-5.5` 且思考为 `medium`。
- 发送 `只回复 ok`，应正常返回 `ok`。
- 若旧会话仍显示其它模型或 Low/High，优先新建会话；旧会话可能保存了 session override。

维护铁律：

- **不要使用** `agents.list[0].model`、`agents.list[1].model` 这类路径写配置。TClaw 配置器会把它误解释为 `id=0`、`id=1` 的新 Agent。
- 修改 Agent 时只能整段读取 `agents`，在本地内存里改完整 JSON，再整段写回 `agents`。
- 设置模型默认值优先使用 `/models/providers` 的 provider/model 默认接口；再整段写回 `agents` 做 Agent 级固定。
- API Key 不写入文档，不在群聊/日志中回显；如曾暴露，需在 TokenSell 后台轮换。

应急回滚：

- 若 GPT-5.5 再次大面积 403，先把 `agents.defaults.model.primary` 与 `market-connect-test.model` 临时回滚到 `tranai/tranai-qwen-plus`，保持业务不中断。
- 回滚后不要删除 `tokensell-gpt55` provider；保留配置，便于修复中转站后快速切回。
- 若 `0`、`1` Agent 再次出现，整段写回 `agents.list`，只保留 `main` 与 `market-connect-test`。

### 8.2 后台定时任务：统一切到 TranAI

**目标**：所有无人值守的后台消耗，从 TokenSell / GPT-5.5 转移到 TranAI，降低空转 token 成本。

适用范围：

- 定时任务页里的 cron / schedule / wakeup。
- `主轮询循环`、`drive-upload --sweep`、巡检、失败重试、长时间待确认提醒。
- 自动恢复 / 自检 / 维护类后台会话。

固定策略：

- 后台模型：`tranai/tranai-qwen-plus`。
- 后台思考：优先 `low` 或关闭深度思考；如果配置只能写枚举，就写 `low`。
- 人工聊天仍保留 `tokensell-gpt55/gpt-5.5 · medium`。
- 若某个 cron 不能单独设置模型，则新建/复用一个专用维护 Agent，例如 `maintenance-background`，它的默认模型设为 `tranai/tranai-qwen-plus`，所有 cron 都触发这个 Agent。

验收：

- 手动触发任一后台 cron，检查新会话右下角模型应显示 TranAI / qwen，而不是 `gpt-5.5`。
- 观察 TokenSell 后台，后台 cron 运行时不应继续增长 GPT-5.5 消耗。
- 人工打开 `market-connect-test` 聊天，仍应显示 `gpt-5.5 · Medium`。

### 8.3 lark-cli 持久化与自愈

**目标**：解决 `lark-cli` 经常“莫名其妙消失”的问题。

固定路径：

- 持久化根目录：`/home/node/.openclaw`
- npm prefix：`/home/node/.openclaw/npm-global`
- lark-cli：`/home/node/.openclaw/npm-global/bin/lark-cli`

安装/修复脚本：

```bash
bash scripts/bootstrap/ensure_lark_cli.sh
bash scripts/bootstrap/ensure_lark_cli.sh --auth-check
```

维护规则：

- 不把 lark-cli 装到临时目录、项目目录根部或系统不可持久化 npm global 目录。
- `drive_uploader.py` 如果找不到配置里的 `lark-cli`，会自动调用 `scripts/bootstrap/ensure_lark_cli.sh --print-path` 修复。
- 若 `auth status` 需要用户授权，必须叫 Alan 来授权；不要把未授权状态伪装成成功。
- 官方安装包是 `@larksuite/cli`，安装时必须允许 npm scripts；如果环境设置了 `ignore-scripts=true`，CLI 可能装完但不可用。

## 9. 待办与下一步（截至 2026-07-07）

- [ ] 12 领用的大文件分支（UI 配置/抽查）
- [ ] 13 大文件分支真实场景实测
- [ ] 区域市场码统一、区域配置表补成员、表单触发 VM 白名单
- [x] **合并确认与发布**（2026-08-12 已上线：确认卡「通过并发布」一次交互完成入库+发布；「仅入库」保留待发布路径）
- [ ] P1：版本对比、旧版追踪、巡检

## 10. 工具

`lark-cli base +…`(记录/字段/视图/workflow)、`lark-cli im +…`(收发消息/下载群文件)、`lark-cli drive +…`(云盘上传/权限/取附件)。默认 `--as user`。高风险写操作（permission.public patch、delete 等）需 `--yes`，先 `--dry-run` 预览。
