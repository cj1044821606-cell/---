# 任务：安装并测试「云盘上传器」（绕过工作流 30M 附件上限）

TClaw，下面这套脚本要装在**你所在的这台 VM** 上运行。请按步骤执行，每步做完在群里回状态，遇到报错先贴原文再继续。

---

## 0. 背景与你的边界（先读）

**要解决的问题**：用户点主表「获取附件」按钮时，多维表格工作流推附件有 **30M 上限**，大文件直接失败、消息发不出去。

**新架构**：用户问卷上传的 M/L/S 三个附件，**全部**先传到云盘、拿到「组织内可看」链接、回填多维表格；之后发大文件就发链接。

**你的边界（重要）**：
- **你不负责把附件传云盘**。那是一个**独立常驻进程**（监听器 + Python 上传器）干的，跟你是两个程序，别把它揉进你的处理流程、别分心。
- 你只负责：**① 这次的安装部署**；② 日常里等云盘链接字段填好后再走你原本的识别/命名/入库流程（见第 6 节门控）。
- 上传器已经做了幂等 + 记录锁，你不用管重复问题。

---

## 1. 交付物（4 个文件，都在 `scripts/drive-upload/`）

| 文件 | 作用 |
|---|---|
| `drive_upload.env` | 配置（base/表/域名/云盘文件夹/身份/大文件阈值） |
| `drive_uploader.py` | 核心上传器：下载附件→传云盘→设组织内可看→回填链接。支持 `<record_id>` 单条 与 `--sweep` 扫描补漏 |
| `drive_upload_listener.sh` | 监听器（自监督）：订阅 `im.message.receive_v1`，收到触发消息就调上传器 |
| `start_listener.sh` | detached 拉起监听器（幂等，无 systemd 环境用；可放进你的每次启动流程） |
| `drive-uploader.service` | systemd 单元，**仅当把监听器搬到带 systemd 的独立主机时才用**（本 K8s Pod 用不上） |

---

## 2. 部署脚本 + 依赖检查

1. 把这 4 个文件放到 VM 上一个固定目录，建议 `/opt/drive-upload/`（若无 root，就放你工作区的 `scripts/drive-upload/`，后面服务路径相应改）。
2. `chmod +x drive_uploader.py drive_upload_listener.sh`
3. 依赖检查（缺哪个装哪个）：
   - `python3 --version`（要 3.6+）
   - `lark-cli --version` 且已登录（`lark-cli whoami --as user` 和 `--as bot` 都要 OK）
   - `bash --version`（4+）

---

## 3. 在「AI待处理池」建 3 个链接字段（+ 可选大文件复选）

用 `--as user` 建（字段名不要带括号，方便脚本写入）：

```bash
BT=DPCCbp65waiDtys1JfucMKm8nTe
POOL=tblcAERSb9EKbx5W
lark-cli base +field-create --base-token $BT --table-id $POOL --json '{"field_name":"云盘链接M","type":1}' --as user
lark-cli base +field-create --base-token $BT --table-id $POOL --json '{"field_name":"云盘链接L","type":1}' --as user
lark-cli base +field-create --base-token $BT --table-id $POOL --json '{"field_name":"云盘链接S","type":1}' --as user
# 可选：混合发送用的大文件标记（复选字段，type 7）
lark-cli base +field-create --base-token $BT --table-id $POOL --json '{"field_name":"是否大文件","type":7}' --as user
```

> 说明：上传器按**稳定 field_id** 读附件字段（`fldcOKGnHe`=上传文件/M、`fld05lnLJQ`=源文件(L)、`fldTZF6vCx`=预览文件（S）），写入按上面这三个链接字段**名**。若哪天 field-list 里这些附件字段 id 变了，改 `drive_uploader.py` 顶部的 `SRC_TO_LINK`。

建完 `lark-cli base +field-list --base-token $BT --table-id $POOL` 回读确认 4 个字段都在。

---

## 4. 建云盘文件夹 + 填 env

```bash
lark-cli drive +create-folder --name "AI物料版本管理系统-物料库" --as user
```
拿到返回里的 **folder token**，写进 `drive_upload.env` 的 `DRIVE_FOLDER_TOKEN="..."`。
若第 3 步建了「是否大文件」，同时把 env 里 `BIG_FILE_FIELD="是否大文件"`（默认空=不打标记）。

---

## 5. 让脚本跑起来（本 VM 是 K8s 容器，无 systemd）

**环境事实**：本 VM 是容器化 Pod，PID1=tini→entrypoint→`node … gateway`（OpenClaw 主进程），`systemctl` offline、无 systemd user。所以**传统守护进程没有被支持的自启/重启机制，Pod 重启后非主进程会消失**。据此分两条线：

### 5A. 低延迟线：自监督监听器（当前测试用这条）
监听器已改成**自监督**（有界 consume + 自动重连 + flock 单实例锁），不依赖 systemd。用 detached 方式拉起：
```bash
bash start_listener.sh          # 幂等，重复调用不会起第二个
tail -f /tmp/drive_uploader/uploader.log   # 应看到 "监听器启动"
```
- **Pod 存活期间**：断线/超时自动重连，稳定运行。
- **Pod 重启后**：本进程会没，需要重新拉起 → 把 `bash start_listener.sh` 放进**你（TClaw）的「每次启动」流程**（flock 保证不重复），或让平台方把它加进 `entrypoint.sh`（`exec node … gateway` 之前后台起）/ 加个 **sidecar 容器**（最 K8s-正规，需 TranAI 改部署）。
- **别 `kill -9` consume 进程**（会泄漏服务端订阅），停用：`kill` 对应 bash 进程或删 flock 后自然退出。

### 5B. 兜底线：扫描补漏（强烈建议同时挂上）
因为容器环境守护进程不稳，监听器可能漏（重连间隙、Pod 重启期间的触发）。上传器带 `--sweep` 模式，扫出「有 M 附件但云盘链接M 为空」的记录批量补传：
```bash
python3 drive_uploader.py --sweep
```
**推荐把这条 `--sweep` 挂进你已有的「主轮询循环」**——每个轮询周期顺手跑一次（一条确定性命令，不占你注意力）。这样即使监听器挂了，最坏也就延迟一个轮询周期，绝不丢件。这其实也贴合最初「TClaw 只负责触发脚本」的设想。

> 结论：**测试期 = 5A 监听器 + 5B 每轮 sweep 兜底**。要生产级稳，就请 TranAI 上 sidecar/entrypoint，或把监听器搬到一台带 systemd 的独立小主机（那时才用附带的 `drive-uploader.service`）。

---

## 6. 冒烟测试（先不接自动化，手动验证上传器本身）

挑一条待处理池里**有附件**的记录 id（`lark-cli base +record-list --base-token $BT --table-id $POOL --field-id 上传文件 --limit 1 --format json` 拿 `record_id_list`），直接跑：

```bash
python3 drive_uploader.py <record_id>
```
预期：日志出现 `✅ 文件名 → https://transsioner.feishu.cn/file/xxx`，然后 `💾 已写入 云盘链接M`。
去多维表格看那条记录的「云盘链接M」应已填链接；用**别的组织内账号**点链接应能打开（验证「组织内可看」生效）。再跑一次同一条 → 应显示 `↩ 已有链接，跳过`（幂等 OK）。

---

## 7. 需要人去飞书 UI 配的（你改不了多维表格自动化，请转告用户）

1. **主表也建同名 3 个链接字段**（云盘链接M/L/S，你可以用 field-create 建，table_id=`tbl3C5fTH08IyLkA`）。
2. **7.5 / 08 同步自动化**：把「云盘链接M/L/S」加进「处理池→主表」的同步映射，让入库时链接带进主表。
3. **触发自动化**：新建/改造「新记录→发消息」自动化，让它在**待处理池新增记录**时，往一个**机器人(TClaw)在场的会话**发一条消息，内容**必须包含**标记和记录链接，例如：
   `[云盘上传] {{记录链接}}`
   （监听器从里面 grep 出 `rec...` 记录 id）。若发在群里，需在开发者后台给应用开**群消息**事件/权限；发**私聊**给机器人则只需 p2p 权限（更省事）。会话固定的话，把该 `oc_` 填进 env 的 `TRIGGER_CHAT_ID` 更稳。
4. **门控自动化**：加条件——待处理池「云盘链接M」非空后，才 @TClaw 触发识别流程（你收到后再开始干活）。
5. **发送侧改混合发送**：把「获取(12)」「下架通知(13)」自动化的发送节点改成——`是否大文件=否` 推附件、`=是` 发 `主表.云盘链接M` 文本。

---

## 8. 端到端联调

用户从问卷上传一个 **>30M** 的 M 文件 → 待处理池新增记录 → 触发自动化发 `[云盘上传]...` → 监听器日志出现 `触发 → record_id=...` → 上传器回填链接 + 打「是否大文件=是」→ 门控放行 @你 → 你走识别/命名/入库（链接随同步进主表）→ 用户点「获取」→ 因是大文件、自动化发链接而非附件 → 成功。

---

## 9. 排障速查

| 现象 | 排查 |
|---|---|
| 监听器起不来/立刻退出 | 看日志有没有 `监听器启动`；`lark-cli event status` 看 bus；若报「已在运行」是 flock 生效（正常）；Pod 重启后需重新 `bash start_listener.sh` |
| 监听器可能漏件 | 正常兜底靠 `--sweep`：确认「主轮询循环」里每轮跑了 `python3 drive_uploader.py --sweep` |
| 收不到触发 | 触发消息是否含标记 `[云盘上传]` 和 `rec...`；机器人是否在该会话；群消息要开 `im:message.group_msg` 权限；`TRIGGER_CHAT_ID` 是否填错 |
| `配置缺失: DRIVE_FOLDER_TOKEN` | env 没填云盘文件夹 token |
| 链接点开没权限 | 确认 `permission.public patch` 用的是 `--as user` 且 `link_share_entity=tenant_readable`；上传身份必须是 user |
| `目标字段不存在，请先创建 云盘链接M` | 第 3 步字段没建/名字不符 |
| 附件下载失败 | Base 附件必须用 `record-download-attachment`（脚本已用），别用别的下载命令 |

日志统一在 `/tmp/drive_uploader/uploader.log`（env `LOG_FILE` 可改）。
