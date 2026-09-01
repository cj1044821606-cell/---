#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
云盘上传器 —— 把「物料资产主表」已入库定稿记录里的附件(M/L/S)传到云盘，设「组织内可看」，
并把云盘链接回写到对应的「云盘链接M/L/S」字段。幂等 + 记录级锁。

用法:
    python3 drive_uploader.py <record_id>

设计要点:
- 只操作物料资产主表：主表记录由 7.5 在「已入库」时创建，附件已完成标准命名；链接直接写主表，12/13 从主表读取。
- 附件字段用稳定的 field_id 映射，不用易错的字段名（真实名带全角括号）。
- 一个附件字段可含多个文件 → 生成多个链接，换行拼接写入文本字段。
- 幂等：链接字段已非空则跳过；记录级锁防并发/重复触发重复上传。
- 全部通过 lark-cli 子进程完成，不依赖系统 jq（用 python 解析 JSON）。
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime

# ---- 读取同目录 env（简单解析 KEY="VALUE"）----
HERE = os.path.dirname(os.path.abspath(__file__))


def load_env(path):
    cfg = {}
    if not os.path.exists(path):
        return cfg
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export "):]
            if "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip()
            # 处理行内注释：带引号取引号内内容；不带引号截到第一个 #
            if v and v[0] in "\"'":
                q = v[0]
                end = v.find(q, 1)
                v = v[1:end] if end != -1 else v[1:]
            else:
                v = v.split("#", 1)[0].strip()
            cfg[k.strip()] = v
    return cfg


ENV = load_env(os.path.join(HERE, "drive_upload.env"))

BASE_TOKEN = ENV.get("BASE_TOKEN", "")
TABLE_ID = ENV.get("TABLE_ID", "")
DOMAIN = ENV.get("FEISHU_DOMAIN", "")
FOLDER = ENV.get("DRIVE_FOLDER_TOKEN", "")
IDENTITY = ENV.get("UPLOAD_IDENTITY", "user")
LINK_SHARE = ENV.get("LINK_SHARE", "tenant_readable")
WORK_DIR_NAME = ENV.get("WORK_DIR", ".drive_upload_work")
if os.path.isabs(WORK_DIR_NAME) or WORK_DIR_NAME == ".." or WORK_DIR_NAME.startswith(".." + os.sep):
    raise RuntimeError("WORK_DIR 必须是脚本目录内的相对路径，不能用绝对路径或 ..")
WORK_DIR = os.path.abspath(os.path.join(HERE, WORK_DIR_NAME))
if os.path.commonpath([HERE, WORK_DIR]) != HERE:
    raise RuntimeError("WORK_DIR 必须位于脚本目录内")
LOG_FILE_NAME = ENV.get("LOG_FILE", "uploader.log")
LOG_FILE = os.path.join(WORK_DIR, LOG_FILE_NAME) if not os.path.isabs(LOG_FILE_NAME) else LOG_FILE_NAME
LARK_REQUESTED = ENV.get("LARK_CLI", "lark-cli")
BIG_FILE_FIELD = ENV.get("BIG_FILE_FIELD", "").strip()
try:
    BIG_FILE_BYTES = int(float(ENV.get("BIG_FILE_MB", "28"))) * 1024 * 1024
except ValueError:
    BIG_FILE_BYTES = 28 * 1024 * 1024

# 主表 M(当前有效附件) 字段 id
M_FIELD_ID = "fld4WpNDoL"
# 大文件判定覆盖的全部附件字段（M/L/S 一起发，任一超限整条消息就超限）
BIGCHECK_FIELD_IDS = ["fld4WpNDoL", "fldJ1mRwLq", "fldomSV8ds"]

if ENV.get("LARK_CLI_NO_PROXY"):
    os.environ["LARK_CLI_NO_PROXY"] = ENV["LARK_CLI_NO_PROXY"]

# 【主表】附件字段 field_id -> 目标云盘链接字段名
# field_id 来自 field-list（稳定）：
#   fld4WpNDoL = 当前有效附件(M)   fldJ1mRwLq = 源文件(L)   fldomSV8ds = 预览文件(S)
SRC_TO_LINK = {
    "fld4WpNDoL": "云盘链接M",
    "fldJ1mRwLq": "云盘链接L",
    "fldomSV8ds": "云盘链接S",
}

LOCK_TTL = 900  # 秒；超过则认为是死锁，抢占


def log(msg):
    line = "[%s] %s" % (datetime.now().strftime("%F %T"), msg)
    print(line, flush=True)
    try:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def resolve_lark_cli(requested):
    """
    找到可用的 lark-cli；若配置/环境中的 lark-cli 消失，则调用持久化安装脚本自愈。

    TClaw 运行在容器化 VM/Pod 中，/home/node/.openclaw 是已确认的持久化目录；
    npm 全局安装在其它临时路径时，重启/清理后可能丢失。
    """
    candidates = []
    if requested:
        if os.path.isabs(requested):
            candidates.append(requested)
        else:
            found = shutil.which(requested)
            if found:
                candidates.append(found)

    persistent_bin = ENV.get(
        "LARK_CLI_PERSIST_BIN",
        "/home/node/.openclaw/npm-global/bin/lark-cli",
    )
    if persistent_bin not in candidates:
        candidates.append(persistent_bin)

    for candidate in candidates:
        if candidate and os.path.exists(candidate) and os.access(candidate, os.X_OK):
            probe = subprocess.run([candidate, "--version"], capture_output=True, text=True)
            if probe.returncode == 0:
                return candidate

    ensure_script = os.path.abspath(os.path.join(HERE, "..", "bootstrap", "ensure_lark_cli.sh"))
    if os.path.exists(ensure_script):
        p = subprocess.run(
            ["bash", ensure_script, "--print-path"],
            cwd=os.path.dirname(ensure_script),
            capture_output=True,
            text=True,
        )
        if p.returncode == 0:
            for line in reversed(p.stdout.splitlines()):
                line = line.strip()
                if line and os.path.isabs(line) and os.path.exists(line) and os.access(line, os.X_OK):
                    return line
        raise RuntimeError(
            "lark-cli 不可用，且自愈安装失败。\nstdout: %s\nstderr: %s"
            % (p.stdout[-1200:], p.stderr[-1200:])
        )

    raise RuntimeError(
        "lark-cli 不可用，且未找到自愈脚本 scripts/bootstrap/ensure_lark_cli.sh；"
        "请先把 lark-cli 安装到 /home/node/.openclaw/npm-global/bin/lark-cli。"
    )


LARK = resolve_lark_cli(LARK_REQUESTED)


def lark(args, want_json=True):
    """跑一条 lark-cli，返回解析后的 JSON（want_json）或 (rc, stdout)。"""
    cmd = [LARK] + args
    if want_json and "--format" not in args:
        cmd += ["--format", "json"]
    p = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True)
    out = p.stdout.strip()
    if not want_json:
        return p.returncode, out, p.stderr
    # 剥掉可能的 [lark-cli] [WARN] 代理提示行，取第一个 { 开始的 JSON
    idx = out.find("{")
    if idx == -1:
        raise RuntimeError("lark-cli 非 JSON 输出: %s\nstderr: %s" % (out[:400], p.stderr[:400]))
    data = json.loads(out[idx:])
    if data.get("ok") is False:
        err = data.get("error", {})
        raise RuntimeError("lark-cli 失败 %s: %s" % (err.get("type"), err.get("message") or data))
    return data


def cli_relative_path(path):
    """lark-cli 在受限 VM 中只接受脚本目录内的相对文件路径。"""
    relative = os.path.relpath(path, HERE)
    if relative == ".." or relative.startswith(".." + os.sep):
        raise RuntimeError("文件路径越出脚本目录: %s" % path)
    return relative


def cleanup_temp_dir(path):
    """逐个清理本次下载产生的临时文件，不递归删除未知目录。"""
    if not os.path.isdir(path):
        return
    leftovers = []
    for entry in os.scandir(path):
        if entry.is_file(follow_symlinks=False):
            os.remove(entry.path)
        else:
            leftovers.append(entry.name)
    if leftovers:
        log("  ⚠ 临时目录含未知内容，保留待检查: %s" % path)
        return
    os.rmdir(path)


def deep_find(obj, key):
    """在嵌套结构里深度搜索某个 key 的第一个值。"""
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            r = deep_find(v, key)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = deep_find(v, key)
            if r is not None:
                return r
    return None


def get_cell(record_id, field_id):
    """读单个字段的单元格值。字段不存在返回 ('missing', None)；存在返回 ('ok', cell)。"""
    data = lark([
        "base", "+record-get",
        "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
        "--record-id", record_id, "--field-id", field_id,
        "--as", IDENTITY,
    ])["data"]
    fields = data.get("fields") or []
    if field_id not in fields:
        # 有的返回用 field_id_list 承载
        if field_id not in (data.get("field_id_list") or []):
            return "missing", None
        col = (data.get("field_id_list") or []).index(field_id)
    else:
        col = fields.index(field_id)
    matrix = data.get("data") or []
    if not matrix or col >= len(matrix[0]):
        return "ok", None
    return "ok", matrix[0][col]


def cell_is_empty(cell):
    if cell is None:
        return True
    if isinstance(cell, (list, str)) and len(cell) == 0:
        return True
    return False


def cell_to_text(cell):
    """把文本单元格值归一成字符串（可能是 str 或 [{text:..}] 段落）。"""
    if cell is None:
        return ""
    if isinstance(cell, str):
        return cell
    if isinstance(cell, list):
        parts = []
        for seg in cell:
            if isinstance(seg, dict):
                parts.append(seg.get("text") or seg.get("link") or "")
            else:
                parts.append(str(seg))
        return "".join(parts)
    return str(cell)


def process_attachment_file(record_id, file_token, name):
    """下载一个附件 → 上传云盘 → 设组织内可看 → 返回云盘链接。"""
    tmp = tempfile.mkdtemp(prefix="dup_", dir=WORK_DIR)
    try:
        # 1) 下载附件到临时目录（Base 附件必须用这个专用命令）
        lark([
            "base", "+record-download-attachment",
            "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
            "--record-id", record_id, "--file-token", file_token,
            "--output", cli_relative_path(tmp), "--overwrite", "--as", IDENTITY,
        ])
        files = [os.path.join(tmp, x) for x in os.listdir(tmp)]
        files = [x for x in files if os.path.isfile(x)]
        if not files:
            raise RuntimeError("下载后未找到本地文件: %s" % name)
        local = files[0]
        # 保底：把本地文件名改成附件标准名，让云盘里也是标准名
        std = os.path.join(tmp, name)
        if os.path.abspath(local) != os.path.abspath(std):
            shutil.move(local, std)
            local = std

        # 2) 上传到云盘指定文件夹
        up = lark([
            "drive", "+upload",
            "--file", cli_relative_path(local), "--folder-token", FOLDER,
            "--name", name, "--as", IDENTITY,
        ])
        new_token = deep_find(up, "file_token")
        if not new_token:
            raise RuntimeError("云盘上传未返回 file_token: %s" % json.dumps(up)[:300])

        # 3) 设链接分享 = 组织内可看
        lark([
            "drive", "permission.public", "patch",
            "--params", json.dumps({"token": new_token, "type": "file"}),
            "--data", json.dumps({"link_share_entity": LINK_SHARE}),
            "--as", IDENTITY, "--yes",
        ])

        url = "https://%s/file/%s" % (DOMAIN, new_token)
        log("  ✅ %s → %s" % (name, url))
        return url
    finally:
        cleanup_temp_dir(tmp)


def process_record(record_id):
    for src_fid, link_field in SRC_TO_LINK.items():
        try:
            status, cell = get_cell(record_id, src_fid)
            if status == "missing":
                continue  # 该附件字段这张表没有，跳过
            if cell_is_empty(cell):
                continue  # 没有附件，跳过
            files = cell if isinstance(cell, list) else []

            # 幂等：目标链接字段已填则跳过
            lstatus, lcell = get_cell_by_name(record_id, link_field)
            if lstatus == "missing":
                log("  ⚠ 目标字段不存在，请先创建: %s（跳过）" % link_field)
                continue
            if not cell_is_empty(lcell) and cell_to_text(lcell).strip():
                log("  ↩ 已有链接，跳过 %s" % link_field)
                continue

            log("处理附件字段 %s（%d 个文件）→ %s" % (src_fid, len(files), link_field))
            urls = []
            for att in files:
                ft = att.get("file_token")
                nm = att.get("name") or ft
                if not ft:
                    continue
                urls.append(process_attachment_file(record_id, ft, nm))

            if not urls:
                continue
            # 回写链接（多文件换行拼接）
            lark([
                "base", "+record-upsert",
                "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
                "--record-id", record_id,
                "--json", json.dumps({link_field: "\n".join(urls)}),
                "--as", IDENTITY,
            ])
            log("  💾 已写入 %s（%d 条链接）" % (link_field, len(urls)))
        except Exception as e:
            log("  ❌ 字段 %s 处理失败: %s" % (src_fid, e))
            # 单字段失败不影响其它字段
            continue


def set_big_file_flag(record_id):
    """按 M/L/S 全部附件文件大小，给主表「是否大文件」复选打标（服务整组混合发送）。
    因为 12/13 是 M/L/S 三附件一条消息一起发，任一文件超限整条消息就超限。"""
    if not BIG_FILE_FIELD:
        return
    try:
        big = False
        for fid in BIGCHECK_FIELD_IDS:
            status, cell = get_cell(record_id, fid)
            if status == "missing" or cell_is_empty(cell):
                continue
            if any((att.get("size") or 0) >= BIG_FILE_BYTES for att in cell if isinstance(att, dict)):
                big = True
                break
        lark([
            "base", "+record-upsert",
            "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
            "--record-id", record_id,
            "--json", json.dumps({BIG_FILE_FIELD: bool(big)}),
            "--as", IDENTITY,
        ])
        log("  🏷 %s = %s" % (BIG_FILE_FIELD, big))
    except Exception as e:
        log("  ⚠ 大文件标记失败: %s" % e)


def get_cell_by_name(record_id, field_name):
    """按字段名读单元格（用于读链接文本字段）。"""
    data = lark([
        "base", "+record-get",
        "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
        "--record-id", record_id, "--field-id", field_name,
        "--as", IDENTITY,
    ])["data"]
    fields = data.get("fields") or []
    if field_name not in fields:
        return "missing", None
    col = fields.index(field_name)
    matrix = data.get("data") or []
    if not matrix or col >= len(matrix[0]):
        return "ok", None
    return "ok", matrix[0][col]


def acquire_lock(record_id):
    os.makedirs(os.path.join(WORK_DIR, "locks"), exist_ok=True)
    lock = os.path.join(WORK_DIR, "locks", record_id + ".lock")
    try:
        os.mkdir(lock)
        return lock
    except FileExistsError:
        age = time.time() - os.path.getmtime(lock)
        if age > LOCK_TTL:
            log("发现超时死锁(%.0fs)，抢占: %s" % (age, record_id))
            try:
                os.rmdir(lock)
                os.mkdir(lock)
                return lock
            except OSError:
                return None
        return None


def run_one(record_id):
    lock = acquire_lock(record_id)
    if not lock:
        log("已在处理中，跳过: %s" % record_id)
        return
    log("=== 开始处理 %s ===" % record_id)
    try:
        process_record(record_id)
        set_big_file_flag(record_id)
        log("=== 完成 %s ===" % record_id)
    finally:
        try:
            os.rmdir(lock)
        except OSError:
            pass


def sweep():
    """扫描补漏：找出「当前有效附件(M) 有附件、但 云盘链接M 为空」的主表记录，逐条处理。
    用于兜底事件监听的漏网/重连间隙/Pod 重启期间错过的触发。"""
    log("=== 开始扫描补漏 ===")
    offset, total, done = 0, 0, 0
    while True:
        data = lark([
            "base", "+record-list",
            "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
            "--field-id", M_FIELD_ID, "--field-id", "云盘链接M",
            "--offset", str(offset), "--limit", "200", "--as", IDENTITY,
        ])["data"]
        ids = data.get("record_id_list") or []
        matrix = data.get("data") or []
        fid_list = data.get("field_id_list") or []
        names = data.get("fields") or []
        # 定位列
        try:
            m_col = fid_list.index(M_FIELD_ID)
        except ValueError:
            m_col = names.index("当前有效附件") if "当前有效附件" in names else None
        link_col = names.index("云盘链接M") if "云盘链接M" in names else None
        if m_col is None or link_col is None:
            log("扫描中止：找不到 当前有效附件 或 云盘链接M 列（请确认字段已建）")
            return
        for i, rid in enumerate(ids):
            total += 1
            row = matrix[i] if i < len(matrix) else []
            m_cell = row[m_col] if m_col < len(row) else None
            link_cell = row[link_col] if link_col < len(row) else None
            if cell_is_empty(m_cell):
                continue
            if not cell_is_empty(link_cell) and cell_to_text(link_cell).strip():
                continue
            log("补漏处理 %s" % rid)
            run_one(rid)
            done += 1
        if not data.get("has_more"):
            break
        offset += len(ids) if ids else 200
    log("=== 扫描完成：共 %d 条，处理 %d 条 ===" % (total, done))


def main():
    for req, val in [("BASE_TOKEN", BASE_TOKEN), ("TABLE_ID", TABLE_ID),
                     ("FEISHU_DOMAIN", DOMAIN), ("DRIVE_FOLDER_TOKEN", FOLDER)]:
        if not val:
            log("配置缺失: %s（请检查 drive_upload.env）" % req)
            sys.exit(2)
    os.makedirs(WORK_DIR, exist_ok=True)

    args = [a for a in sys.argv[1:] if a.strip()]
    if not args:
        print("用法: python3 drive_uploader.py <record_id> | --sweep", file=sys.stderr)
        sys.exit(2)
    if args[0] == "--sweep":
        sweep()
    else:
        run_one(args[0].strip())


if __name__ == "__main__":
    main()
