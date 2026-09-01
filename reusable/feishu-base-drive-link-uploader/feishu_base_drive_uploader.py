#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Feishu Base attachment -> Drive link uploader.

For each configured attachment field on one Base record, the script:
  1. downloads the Base attachment;
  2. uploads it to a chosen Drive folder with the same file name;
  3. sets the Drive link to the configured visibility; and
  4. writes the Drive URL back to the matching text field in Base.

It is deliberately polling-friendly: run once for one record, or use --sweep
to repair every record whose sweep-source attachment exists while its link
field is blank. Existing links are never overwritten, so repeated runs are
idempotent.

Usage:
  python3 feishu_base_drive_uploader.py --validate
  python3 feishu_base_drive_uploader.py <record_id>
  python3 feishu_base_drive_uploader.py --sweep
"""

import json
import os
import subprocess
import sys
import time
import uuid
from datetime import datetime


HERE = os.path.dirname(os.path.abspath(__file__))


def load_env(path):
    """Parse simple KEY=value lines, preserving quoted values and ignoring comments."""
    values = {}
    if not os.path.exists(path):
        return values
    with open(path, encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:]
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip()
            if value[:1] in ("\"", "'"):
                quote = value[0]
                end = value.find(quote, 1)
                value = value[1:end] if end != -1 else value[1:]
            else:
                value = value.split("#", 1)[0].strip()
            values[key.strip()] = value
    return values


ENV = load_env(os.path.join(HERE, "drive_upload.env"))
BASE_TOKEN = ENV.get("BASE_TOKEN", "")
TABLE_ID = ENV.get("TABLE_ID", "")
FOLDER_TOKEN = ENV.get("DRIVE_FOLDER_TOKEN", "")
DOMAIN = ENV.get("FEISHU_DOMAIN", "")
IDENTITY = ENV.get("UPLOAD_IDENTITY", "user")
LINK_SHARE = ENV.get("LINK_SHARE", "tenant_readable")
LARK = ENV.get("LARK_CLI", "lark-cli")
BIG_FILE_FIELD = ENV.get("BIG_FILE_FIELD", "").strip()
LOCK_TTL_SECONDS = int(ENV.get("LOCK_TTL_SECONDS", "900"))

try:
    BIG_FILE_BYTES = int(float(ENV.get("BIG_FILE_MB", "28")) * 1024 * 1024)
except ValueError:
    BIG_FILE_BYTES = 28 * 1024 * 1024


def parse_json_setting(name, default):
    raw = ENV.get(name, "")
    if not raw:
        return default
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("%s 不是合法 JSON：%s" % (name, exc)) from exc
    return value


# Example: {"fldAttachmentM":"云盘链接M", "fldAttachmentL":"云盘链接L"}
ATTACHMENT_LINK_MAP = parse_json_setting("ATTACHMENT_LINK_MAP", {})
# The sweep only needs one attachment/link pair to identify unfinished records.
SWEEP_SOURCE_FIELD_ID = ENV.get("SWEEP_SOURCE_FIELD_ID", "")
SWEEP_LINK_FIELD = ENV.get("SWEEP_LINK_FIELD", "")
BIGCHECK_FIELD_IDS = parse_json_setting("BIGCHECK_FIELD_IDS", [])


def relative_work_root():
    """Keep all lark-cli file arguments inside this package directory.

    Some hosted lark-cli environments reject absolute paths or paths outside
    the current working directory. A package-local work directory avoids that.
    """
    requested = ENV.get("WORK_DIR", ".drive_upload_work").strip() or ".drive_upload_work"
    if os.path.isabs(requested) or requested == ".." or requested.startswith(".." + os.sep):
        raise RuntimeError("WORK_DIR 必须是脚本目录内的相对路径，不能用绝对路径或 ..")
    root = os.path.abspath(os.path.join(HERE, requested))
    if os.path.commonpath([HERE, root]) != HERE:
        raise RuntimeError("WORK_DIR 必须位于脚本目录内")
    os.makedirs(root, exist_ok=True)
    return root


WORK_ROOT = relative_work_root()
LOG_FILE = os.path.join(WORK_ROOT, ENV.get("LOG_FILE", "uploader.log"))
if ENV.get("LARK_CLI_NO_PROXY"):
    os.environ["LARK_CLI_NO_PROXY"] = ENV["LARK_CLI_NO_PROXY"]


def log(message):
    line = "[%s] %s" % (datetime.now().strftime("%F %T"), message)
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    except OSError:
        pass


def decode_envelope(raw):
    """Extract one lark-cli JSON envelope even when warnings precede it."""
    start = raw.find("{")
    if start == -1:
        return None
    try:
        return json.JSONDecoder().raw_decode(raw[start:])[0]
    except json.JSONDecodeError:
        return None


def lark(args):
    command = [LARK] + list(args)
    if "--format" not in command and "--json" not in command:
        command += ["--format", "json"]
    process = subprocess.run(command, cwd=HERE, capture_output=True, text=True)
    envelope = decode_envelope(process.stdout) or decode_envelope(process.stderr)
    if envelope is None:
        raise RuntimeError(
            "lark-cli 没有返回可解析 JSON（exit=%s）：%s" %
            (process.returncode, (process.stderr or process.stdout)[:500])
        )
    if envelope.get("ok") is False:
        error = envelope.get("error", {})
        raise RuntimeError("lark-cli 失败 %s：%s" % (error.get("type"), error.get("message")))
    if process.returncode != 0:
        raise RuntimeError("lark-cli 异常退出 %s" % process.returncode)
    return envelope


def relative_to_here(path):
    relative = os.path.relpath(path, HERE)
    if relative == ".." or relative.startswith(".." + os.sep):
        raise RuntimeError("文件路径越出脚本目录：%s" % path)
    return relative


def field_index(payload, requested):
    ids = payload.get("field_id_list") or []
    names = payload.get("fields") or []
    if requested in ids:
        return ids.index(requested)
    if requested in names:
        return names.index(requested)
    return None


def get_cell(record_id, field):
    payload = lark([
        "base", "+record-get", "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
        "--record-id", record_id, "--field-id", field, "--as", IDENTITY,
    ]).get("data", {})
    column = field_index(payload, field)
    if column is None:
        return "missing", None
    matrix = payload.get("data") or []
    if not matrix or column >= len(matrix[0]):
        return "ok", None
    return "ok", matrix[0][column]


def empty(cell):
    return cell is None or (isinstance(cell, (str, list)) and not cell)


def cell_text(cell):
    if cell is None:
        return ""
    if isinstance(cell, str):
        return cell
    if isinstance(cell, list):
        return "".join(
            item.get("text") or item.get("link") or "" if isinstance(item, dict) else str(item)
            for item in cell
        )
    return str(cell)


def first_value_deep(value, key):
    if isinstance(value, dict):
        if key in value:
            return value[key]
        for child in value.values():
            found = first_value_deep(child, key)
            if found is not None:
                return found
    if isinstance(value, list):
        for child in value:
            found = first_value_deep(child, key)
            if found is not None:
                return found
    return None


def remove_one_level_temp(directory):
    """Clean only files this invocation created, one explicit path at a time."""
    if not os.path.isdir(directory):
        return
    leftovers = []
    for entry in os.scandir(directory):
        if entry.is_file(follow_symlinks=False):
            os.remove(entry.path)
        else:
            leftovers.append(entry.name)
    if leftovers:
        log("  ⚠ 临时目录含非文件内容，保留待人工检查：%s" % directory)
        return
    os.rmdir(directory)


def upload_attachment(record_id, file_token, file_name):
    """Download one Base attachment, upload it to Drive, set sharing, return URL."""
    session = os.path.join(WORK_ROOT, "job_" + uuid.uuid4().hex)
    os.mkdir(session)
    try:
        lark([
            "base", "+record-download-attachment", "--base-token", BASE_TOKEN,
            "--table-id", TABLE_ID, "--record-id", record_id, "--file-token", file_token,
            "--output", relative_to_here(session), "--overwrite", "--as", IDENTITY,
        ])
        downloaded = [entry.path for entry in os.scandir(session) if entry.is_file()]
        if not downloaded:
            raise RuntimeError("下载后找不到附件：%s" % file_name)
        local = downloaded[0]
        expected_name = os.path.join(session, file_name)
        if os.path.abspath(local) != os.path.abspath(expected_name):
            os.replace(local, expected_name)
            local = expected_name

        uploaded = lark([
            "drive", "+upload", "--file", relative_to_here(local),
            "--folder-token", FOLDER_TOKEN, "--name", file_name, "--as", IDENTITY,
        ])
        file_token = first_value_deep(uploaded, "file_token")
        if not file_token:
            raise RuntimeError("云盘上传未返回 file_token")

        lark([
            "drive", "permission.public", "patch",
            "--params", json.dumps({"token": file_token, "type": "file"}),
            "--data", json.dumps({"link_share_entity": LINK_SHARE}), "--as", IDENTITY,
            "--yes",
        ])
        url = "https://%s/file/%s" % (DOMAIN, file_token)
        log("  ✅ %s → %s" % (file_name, url))
        return url
    finally:
        remove_one_level_temp(session)


def write_fields(record_id, values):
    lark([
        "base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
        "--record-id", record_id, "--json", json.dumps(values, ensure_ascii=False),
        "--as", IDENTITY,
    ])


def set_large_file_flag(record_id):
    if not BIG_FILE_FIELD or not BIGCHECK_FIELD_IDS:
        return
    is_large = False
    for field_id in BIGCHECK_FIELD_IDS:
        status, attachments = get_cell(record_id, field_id)
        if status == "missing" or empty(attachments):
            continue
        for item in attachments if isinstance(attachments, list) else []:
            if isinstance(item, dict) and (item.get("size") or 0) >= BIG_FILE_BYTES:
                is_large = True
                break
        if is_large:
            break
    write_fields(record_id, {BIG_FILE_FIELD: is_large})
    log("  🏷 %s = %s" % (BIG_FILE_FIELD, is_large))


def lock_path(record_id):
    locks = os.path.join(WORK_ROOT, "locks")
    os.makedirs(locks, exist_ok=True)
    return os.path.join(locks, record_id + ".lock")


def acquire_lock(record_id):
    path = lock_path(record_id)
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
        return path
    except FileExistsError:
        age = time.time() - os.path.getmtime(path)
        if age <= LOCK_TTL_SECONDS:
            return None
        log("发现超时锁 %.0f 秒，回收：%s" % (age, record_id))
        os.remove(path)
        return acquire_lock(record_id)


def process_record(record_id):
    lock = acquire_lock(record_id)
    if not lock:
        log("已在处理中，跳过：%s" % record_id)
        return False
    failures = 0
    log("=== 开始处理 %s ===" % record_id)
    try:
        for attachment_field, link_field in ATTACHMENT_LINK_MAP.items():
            try:
                status, attachments = get_cell(record_id, attachment_field)
                if status == "missing" or empty(attachments):
                    continue
                status, existing_link = get_cell(record_id, link_field)
                if status == "missing":
                    raise RuntimeError("找不到目标链接字段：%s" % link_field)
                if not empty(existing_link) and cell_text(existing_link).strip():
                    log("  ↩ 已有链接，跳过 %s" % link_field)
                    continue
                urls = []
                for attachment in attachments if isinstance(attachments, list) else []:
                    if not isinstance(attachment, dict) or not attachment.get("file_token"):
                        continue
                    urls.append(upload_attachment(
                        record_id, attachment["file_token"], attachment.get("name") or attachment["file_token"]
                    ))
                if urls:
                    write_fields(record_id, {link_field: "\n".join(urls)})
                    log("  💾 已写入 %s（%d 条链接）" % (link_field, len(urls)))
            except Exception as exc:
                failures += 1
                log("  ❌ %s 处理失败：%s" % (attachment_field, exc))
        try:
            set_large_file_flag(record_id)
        except Exception as exc:
            failures += 1
            log("  ❌ 大文件标记失败：%s" % exc)
        log("=== 完成 %s ===" % record_id)
        return failures > 0
    finally:
        if os.path.exists(lock):
            os.remove(lock)


def sweep():
    log("=== 开始扫描补漏 ===")
    offset = total = processed = failures = 0
    while True:
        payload = lark([
            "base", "+record-list", "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
            "--field-id", SWEEP_SOURCE_FIELD_ID, "--field-id", SWEEP_LINK_FIELD,
            "--offset", str(offset), "--limit", "200", "--as", IDENTITY,
        ]).get("data", {})
        ids = payload.get("record_id_list") or []
        matrix = payload.get("data") or []
        source_column = field_index(payload, SWEEP_SOURCE_FIELD_ID)
        link_column = field_index(payload, SWEEP_LINK_FIELD)
        if source_column is None or link_column is None:
            raise RuntimeError("sweep 字段不存在：请检查 SWEEP_SOURCE_FIELD_ID / SWEEP_LINK_FIELD")
        for index, record_id in enumerate(ids):
            total += 1
            row = matrix[index] if index < len(matrix) else []
            source = row[source_column] if source_column < len(row) else None
            link = row[link_column] if link_column < len(row) else None
            if empty(source) or (not empty(link) and cell_text(link).strip()):
                continue
            processed += 1
            log("补漏处理 %s" % record_id)
            failures += int(process_record(record_id))
        if not payload.get("has_more"):
            break
        offset += len(ids) if ids else 200
    log("=== 扫描完成：扫描 %d 条，处理 %d 条，失败 %d 条 ===" % (total, processed, failures))
    return failures > 0


def validate():
    payload = lark([
        "base", "+field-list", "--base-token", BASE_TOKEN, "--table-id", TABLE_ID,
        "--as", IDENTITY,
    ]).get("data", {})
    fields = payload.get("fields") or payload.get("items") or []
    ids = {field.get("id") or field.get("field_id") for field in fields}
    names = {field.get("name") or field.get("field_name") for field in fields}
    missing = [field_id for field_id in ATTACHMENT_LINK_MAP if field_id not in ids]
    missing += [name for name in ATTACHMENT_LINK_MAP.values() if name not in names]
    if SWEEP_SOURCE_FIELD_ID not in ids:
        missing.append("SWEEP_SOURCE_FIELD_ID=%s" % SWEEP_SOURCE_FIELD_ID)
    if SWEEP_LINK_FIELD not in names:
        missing.append("SWEEP_LINK_FIELD=%s" % SWEEP_LINK_FIELD)
    if BIG_FILE_FIELD and BIG_FILE_FIELD not in names:
        missing.append("BIG_FILE_FIELD=%s" % BIG_FILE_FIELD)
    if missing:
        raise RuntimeError("配置字段不存在：%s" % ", ".join(missing))
    log("✅ 配置校验通过：%d 个附件字段映射，sweep=%s -> %s" % (
        len(ATTACHMENT_LINK_MAP), SWEEP_SOURCE_FIELD_ID, SWEEP_LINK_FIELD
    ))


def require_config():
    configured = {
        "BASE_TOKEN": BASE_TOKEN,
        "TABLE_ID": TABLE_ID,
        "DRIVE_FOLDER_TOKEN": FOLDER_TOKEN,
        "FEISHU_DOMAIN": DOMAIN,
    }
    missing = [
        name for name, value in configured.items()
        if not value or "你的_" in value or value.startswith("your_")
    ]
    if not ATTACHMENT_LINK_MAP:
        missing.append("ATTACHMENT_LINK_MAP")
    if not SWEEP_SOURCE_FIELD_ID:
        missing.append("SWEEP_SOURCE_FIELD_ID")
    if not SWEEP_LINK_FIELD:
        missing.append("SWEEP_LINK_FIELD")
    if missing:
        raise RuntimeError("缺少配置：%s（请编辑 drive_upload.env）" % ", ".join(missing))


def main():
    try:
        require_config()
        args = [item for item in sys.argv[1:] if item.strip()]
        if len(args) != 1:
            raise RuntimeError("用法：python3 feishu_base_drive_uploader.py --validate | --sweep | <record_id>")
        if args[0] == "--validate":
            validate()
            return 0
        if args[0] == "--sweep":
            return int(sweep())
        return int(process_record(args[0]))
    except Exception as exc:
        log("❌ %s" % exc)
        return 2


if __name__ == "__main__":
    sys.exit(main())
