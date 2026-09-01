#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""施工表「产品单页」的 C&I Datasheet 云盘同步器。

只允许操作配置中的施工表；生产表 ID 被硬编码为拒绝名单。

用法：
  python3 product_page_staging_sync.py --dry-run
  python3 product_page_staging_sync.py --sync
  python3 product_page_staging_sync.py --migrate-fields
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:]
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if value[:1] in ("'", '"') and value[-1:] == value[:1]:
            value = value[1:-1]
        else:
            value = value.split("#", 1)[0].strip()
        values[key.strip()] = value
    return values


ENV = load_env(HERE / "product_page_staging.env")
BASE_TOKEN = ENV.get("BASE_TOKEN", "")
STAGING_TABLE_ID = ENV.get("STAGING_TABLE_ID", "")
PRODUCTION_TABLE_ID = ENV.get("PRODUCTION_TABLE_ID", "tblha90BopV9sDlW")
SOURCE_TABLE_ID = ENV.get("SOURCE_TABLE_ID", "")
DRIVE_FOLDER_TOKEN = ENV.get("DRIVE_FOLDER_TOKEN", "")
CHANGE_LOG_TABLE_ID = ENV.get("CHANGE_LOG_TABLE_ID", "")
DOMAIN = ENV.get("FEISHU_DOMAIN", "transsioner.feishu.cn")
IDENTITY = ENV.get("IDENTITY", "user")
LARK = ENV.get("LARK_CLI", "lark-cli")
WORK_DIR = HERE / ENV.get("WORK_DIR", ".product_page_staging_work")
STATE_PATH = WORK_DIR / "attachment_state.json"
LOCK_PATH = WORK_DIR / "sync.lock"
LOCK_TTL = 900

# 施工表字段。字段 ID 在表内稳定；禁止用名称作为脚本写入键。
PRIMARY_MODEL_FIELD = "fldBXA5fsZ"       # 迁移前：分类；迁移后：产品型号（主字段）
CATEGORY_FIELD = "fld7Ff3m2g"            # 迁移前：产品型号；迁移后：分类（单选）
SOURCE_LINK_FIELD = "fldlyyLIHH"         # 施工表 -> C&I产品资料同步表
LATEST_DATASHEET_FIELD = "fldNVpKX34"
REPORT_CATEGORY_FIELD = "fldfpjJ7PV"    # 施工表正式「分类」单选字段
LATEST_CHANGED_AT_FIELD = "fld4k2eFce"
WEEKLY_PENDING_FIELD = "fldj82QcrY"
SOURCE_ATTACHMENT_FIELD = "fldrS6fY19"  # C&I产品资料同步表：Datasheet文件
VIEW_ID = "vewLPWhAKa"

# 「Datasheet 变更记录」分表字段。该表只追加历史，绝不回写或覆盖已有记录。
CHANGE_LOG_MODEL_FIELD = "fldSMTyL4p"
CHANGE_LOG_CATEGORY_FIELD = "fldc4ZUR77"
CHANGE_LOG_SOURCE_RECORD_FIELD = "fldVWRugzO"
CHANGE_LOG_LINK_FIELD = "fldNwyGE0T"
CHANGE_LOG_TIME_FIELD = "fldXiaXbHt"
CHANGE_LOG_SOURCE_FIELD = "fldWmhcbzn"

CATEGORY_OPTIONS = [
    {"name": "逆变器", "hue": "Blue", "lightness": "Lighter"},
    {"name": "电池", "hue": "Orange", "lightness": "Lighter"},
    {"name": "一体机", "hue": "Wathet", "lightness": "Lighter"},
    {"name": "光伏板", "hue": "Purple", "lightness": "Lighter"},
    {"name": "未分类", "hue": "Gray", "lightness": "Lighter"},
]


def log(message: str) -> None:
    print(f"[{datetime.now():%F %T}] {message}", flush=True)


def require_config() -> None:
    required = {
        "BASE_TOKEN": BASE_TOKEN,
        "STAGING_TABLE_ID": STAGING_TABLE_ID,
        "SOURCE_TABLE_ID": SOURCE_TABLE_ID,
        "DRIVE_FOLDER_TOKEN": DRIVE_FOLDER_TOKEN,
        "CHANGE_LOG_TABLE_ID": CHANGE_LOG_TABLE_ID,
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise RuntimeError("缺少配置：" + ", ".join(missing))
    if STAGING_TABLE_ID == PRODUCTION_TABLE_ID:
        raise RuntimeError("安全中止：施工表 ID 不能等于生产表 ID")
    if STAGING_TABLE_ID != "tblK1lIW8ksoDyRg":
        raise RuntimeError("安全中止：配置的不是已确认的施工表 tblK1lIW8ksoDyRg")


def run_cli(args: list[str]) -> dict[str, Any]:
    command = [LARK, *args]
    if "--format" not in args:
        command.extend(["--format", "json"])
    proc = subprocess.run(command, cwd=HERE, text=True, capture_output=True)
    combined = "\n".join(part for part in (proc.stdout.strip(), proc.stderr.strip()) if part)
    start = combined.find("{")
    if start < 0:
        raise RuntimeError(f"lark-cli 非 JSON 输出：{combined[:500]}")
    payload, _ = json.JSONDecoder().raw_decode(combined[start:])
    if proc.returncode or payload.get("ok") is False:
        error = payload.get("error", {})
        raise RuntimeError(error.get("message") or combined[:500])
    return payload.get("data") or {}


def cli_path(path: Path) -> str:
    """让 CLI 只接收脚本目录内的相对临时路径。"""
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(HERE))
    except ValueError as exc:
        raise RuntimeError(f"临时文件越出脚本目录：{path}") from exc


def read_all_rows(table_id: str, field_ids: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        args = [
            "base", "+record-list", "--base-token", BASE_TOKEN, "--table-id", table_id,
            "--offset", str(offset), "--limit", "200", "--as", IDENTITY,
        ]
        for field_id in field_ids:
            args.extend(["--field-id", field_id])
        data = run_cli(args)
        ids = data.get("record_id_list") or []
        matrix = data.get("data") or []
        returned_ids = data.get("field_id_list") or field_ids
        for record_id, values in zip(ids, matrix):
            rows.append({"record_id": record_id, "fields": dict(zip(returned_ids, values))})
        if not data.get("has_more"):
            return rows
        offset += len(ids) if ids else 200


def as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(str(item.get("text") or item.get("link") or "") if isinstance(item, dict) else str(item) for item in value)
    return str(value)


def linked_ids(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item.get("id")) for item in value if isinstance(item, dict) and item.get("id")]


def attachments_for_target(target: dict[str, Any], source_by_id: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for source_id in linked_ids(target["fields"].get(SOURCE_LINK_FIELD)):
        source = source_by_id.get(source_id)
        if not source:
            log(f"⚠ {target['record_id']}：关联来源 {source_id} 不存在或不可读取")
            continue
        raw_attachments = source["fields"].get(SOURCE_ATTACHMENT_FIELD)
        if not isinstance(raw_attachments, list):
            continue
        for attachment in raw_attachments:
            if not isinstance(attachment, dict) or not attachment.get("file_token"):
                continue
            items.append({
                "source_record_id": source_id,
                "file_token": attachment["file_token"],
                "name": attachment.get("name") or attachment["file_token"],
                "size": attachment.get("size") or 0,
            })
    return items


def fingerprint(attachments: list[dict[str, Any]]) -> str:
    stable = [
        {key: attachment[key] for key in ("source_record_id", "file_token", "name", "size")}
        for attachment in attachments
    ]
    return hashlib.sha256(json.dumps(stable, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def load_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return {"version": 1, "records": {}}
    try:
        payload = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        if isinstance(payload, dict) and isinstance(payload.get("records"), dict):
            return payload
    except (OSError, json.JSONDecodeError) as exc:
        log(f"⚠ 状态文件无法读取，将按首次同步处理：{exc}")
    return {"version": 1, "records": {}}


def write_json_atomic(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def deep_find(obj: Any, key: str) -> Any:
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for value in obj.values():
            found = deep_find(value, key)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for value in obj:
            found = deep_find(value, key)
            if found is not None:
                return found
    return None


def safe_name(name: str) -> str:
    return re.sub(r"[\\/:*?\"<>|]", "_", Path(name).name) or "datasheet.pdf"


def upload_attachment(attachment: dict[str, Any]) -> tuple[str, str]:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="asset_", dir=WORK_DIR))
    name = safe_name(attachment["name"])
    local_file = temp_dir / name
    try:
        run_cli([
            "base", "+record-download-attachment", "--base-token", BASE_TOKEN,
            "--table-id", SOURCE_TABLE_ID, "--record-id", attachment["source_record_id"],
            "--file-token", attachment["file_token"], "--output", cli_path(local_file),
            "--overwrite", "--as", IDENTITY,
        ])
        if not local_file.exists():
            files = [item for item in temp_dir.iterdir() if item.is_file()]
            if len(files) != 1:
                raise RuntimeError("附件下载后未找到唯一文件")
            local_file = files[0]
        uploaded = run_cli([
            "drive", "+upload", "--file", cli_path(local_file), "--folder-token", DRIVE_FOLDER_TOKEN,
            "--name", name, "--as", IDENTITY,
        ])
        file_token = deep_find(uploaded, "file_token")
        if not file_token:
            raise RuntimeError("云盘上传未返回 file_token")
        run_cli([
            "drive", "permission.public", "patch",
            "--params", json.dumps({"token": file_token, "type": "file"}),
            "--data", json.dumps({"link_share_entity": "tenant_readable"}),
            "--as", IDENTITY, "--yes",
        ])
        url = f"https://{DOMAIN}/file/{file_token}"
        return name, url
    finally:
        if temp_dir.exists():
            for item in temp_dir.iterdir():
                if item.is_file():
                    item.unlink()
            if not any(temp_dir.iterdir()):
                temp_dir.rmdir()


def acquire_lock() -> bool:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    try:
        LOCK_PATH.mkdir()
        return True
    except FileExistsError:
        age = time.time() - LOCK_PATH.stat().st_mtime
        if age > LOCK_TTL:
            try:
                LOCK_PATH.rmdir()
                LOCK_PATH.mkdir()
                log(f"⚠ 已接管超时锁（{age:.0f} 秒）")
                return True
            except OSError:
                pass
        return False


def append_sync_change_log(record_id: str, model: str, category: str, value: str, changed_at: str) -> None:
    """追加一次脚本更新历史；失败时让本轮保持失败，避免静默漏记。"""
    run_cli([
        "base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", CHANGE_LOG_TABLE_ID,
        "--json", json.dumps({
            CHANGE_LOG_MODEL_FIELD: model,
            CHANGE_LOG_CATEGORY_FIELD: category,
            CHANGE_LOG_SOURCE_RECORD_FIELD: record_id,
            CHANGE_LOG_LINK_FIELD: value,
            CHANGE_LOG_TIME_FIELD: changed_at,
            CHANGE_LOG_SOURCE_FIELD: "施工同步脚本",
        }, ensure_ascii=False),
        "--as", IDENTITY,
    ])


def update_target_link(record_id: str, links: list[tuple[str, str]], model: str, category: str) -> None:
    value = "\n".join(f"[{name}]({url})" for name, url in links)
    changed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    run_cli([
        "base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", STAGING_TABLE_ID,
        "--record-id", record_id, "--json", json.dumps({
            LATEST_DATASHEET_FIELD: value,
            LATEST_CHANGED_AT_FIELD: changed_at,
            WEEKLY_PENDING_FIELD: True,
        }, ensure_ascii=False),
        "--as", IDENTITY,
    ])
    append_sync_change_log(record_id, model, category, value, changed_at)


def sync(dry_run: bool) -> int:
    if not acquire_lock():
        log("已有同步任务正在运行，本轮跳过")
        return 0
    try:
        targets = read_all_rows(STAGING_TABLE_ID, [
            SOURCE_LINK_FIELD, LATEST_DATASHEET_FIELD, PRIMARY_MODEL_FIELD, REPORT_CATEGORY_FIELD,
        ])
        sources = read_all_rows(SOURCE_TABLE_ID, [SOURCE_ATTACHMENT_FIELD])
        source_by_id = {row["record_id"]: row for row in sources}
        state = load_state()
        state_records = state.setdefault("records", {})
        planned = updated = skipped = failed = 0
        for target in targets:
            attachments = attachments_for_target(target, source_by_id)
            if not attachments:
                skipped += 1
                continue
            asset_fingerprint = fingerprint(attachments)
            previous = state_records.get(target["record_id"], {})
            if previous.get("fingerprint") == asset_fingerprint:
                skipped += 1
                continue
            planned += 1
            names = "、".join(item["name"] for item in attachments)
            log(f"待同步 {target['record_id']}：{names}")
            if dry_run:
                continue
            try:
                links = [upload_attachment(attachment) for attachment in attachments]
                update_target_link(
                    target["record_id"],
                    links,
                    as_text(target["fields"].get(PRIMARY_MODEL_FIELD)).strip(),
                    as_text(target["fields"].get(REPORT_CATEGORY_FIELD)).strip(),
                )
                state_records[target["record_id"]] = {
                    "fingerprint": asset_fingerprint,
                    "links": [url for _, url in links],
                    "synced_at": datetime.now().isoformat(timespec="seconds"),
                }
                write_json_atomic(STATE_PATH, state)
                updated += 1
                log(f"✅ 已回填 {target['record_id']}（{len(links)} 个链接）")
            except Exception as exc:
                failed += 1
                log(f"❌ {target['record_id']}：{exc}")
        log(f"同步完成：待处理 {planned}，已更新 {updated}，跳过 {skipped}，失败 {failed}")
        return 1 if failed else 0
    finally:
        try:
            LOCK_PATH.rmdir()
        except OSError:
            pass


def category_for(model: str, existing: str) -> str:
    category = existing.strip()
    if category in {item["name"] for item in CATEGORY_OPTIONS}:
        return category
    if model.strip().upper().startswith("ISP-"):
        return "光伏板"
    return "未分类"


def update_field(field_id: str, payload: dict[str, Any]) -> None:
    run_cli([
        "base", "+field-update", "--base-token", BASE_TOKEN, "--table-id", STAGING_TABLE_ID,
        "--field-id", field_id, "--json", json.dumps(payload, ensure_ascii=False), "--as", IDENTITY, "--yes",
    ])


def current_fields() -> dict[str, dict[str, Any]]:
    data = run_cli([
        "base", "+field-list", "--base-token", BASE_TOKEN, "--table-id", STAGING_TABLE_ID,
        "--offset", "0", "--limit", "200", "--as", IDENTITY,
    ])
    return {field["id"]: field for field in data.get("fields") or []}


def create_category_select() -> str:
    data = run_cli([
        "base", "+field-create", "--base-token", BASE_TOKEN, "--table-id", STAGING_TABLE_ID,
        "--json", json.dumps({"name": "分类", "type": "select", "multiple": False, "options": CATEGORY_OPTIONS}, ensure_ascii=False),
        "--as", IDENTITY,
    ])
    field = data.get("field") or {}
    field_id = field.get("id")
    if not field_id:
        raise RuntimeError("新建分类单选字段未返回 field id")
    return field_id


def migrate_fields() -> int:
    targets = read_all_rows(STAGING_TABLE_ID, [PRIMARY_MODEL_FIELD, CATEGORY_FIELD])
    fields_before = current_fields()
    already_swapped = fields_before.get(PRIMARY_MODEL_FIELD, {}).get("name") == "产品型号"
    backup = {
        "table_id": STAGING_TABLE_ID,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "records": [
            {
                "record_id": row["record_id"],
                "分类": as_text(row["fields"].get(PRIMARY_MODEL_FIELD)),
                "产品型号": as_text(row["fields"].get(CATEGORY_FIELD)),
            }
            for row in targets
        ],
    }
    backup_path = WORK_DIR / f"field_migration_backup_{datetime.now():%Y%m%d_%H%M%S}.json"
    write_json_atomic(backup_path, backup)
    log(f"已创建施工表字段迁移备份：{backup_path.name}")

    if not already_swapped:
        for row in targets:
            old_category = as_text(row["fields"].get(PRIMARY_MODEL_FIELD))
            model = as_text(row["fields"].get(CATEGORY_FIELD)).strip()
            if not model:
                raise RuntimeError(f"安全中止：记录 {row['record_id']} 缺少产品型号，未开始改字段")
            new_category = category_for(model, old_category)
            run_cli([
                "base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", STAGING_TABLE_ID,
                "--record-id", row["record_id"],
                "--json", json.dumps({PRIMARY_MODEL_FIELD: model, CATEGORY_FIELD: new_category}, ensure_ascii=False),
                "--as", IDENTITY,
            ])
    else:
        log("检测到主字段已切换为产品型号，跳过重复写入")

    fields_now = current_fields()
    legacy = fields_now.get(CATEGORY_FIELD, {})
    if legacy.get("name") != "分类（旧文本备份）":
        update_field(CATEGORY_FIELD, {"name": "分类（旧文本备份）", "type": "text", "style": {"type": "plain"}})
    if fields_now.get(PRIMARY_MODEL_FIELD, {}).get("name") != "产品型号":
        update_field(PRIMARY_MODEL_FIELD, {"name": "产品型号", "type": "text", "style": {"type": "plain"}})

    refreshed = current_fields()
    select_field = next((item["id"] for item in refreshed.values() if item.get("name") == "分类" and item.get("type") == "select"), "")
    if not select_field:
        select_field = create_category_select()

    # 旧文本字段已保留为备份；将其值写入正式的单选分类字段。
    for row in targets:
        model = as_text(row["fields"].get(PRIMARY_MODEL_FIELD if already_swapped else CATEGORY_FIELD)).strip()
        old_category = as_text(row["fields"].get(CATEGORY_FIELD if already_swapped else PRIMARY_MODEL_FIELD))
        run_cli([
            "base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", STAGING_TABLE_ID,
            "--record-id", row["record_id"], "--json", json.dumps({select_field: category_for(model, old_category)}, ensure_ascii=False),
            "--as", IDENTITY,
        ])

    ordered_fields = [
        PRIMARY_MODEL_FIELD, select_field, "fldHi9JCWb", "fldrlvqbzT", "fldAHi2P9k", LATEST_DATASHEET_FIELD,
        "fldKbjjuZR", "fldJOfKRrL", "fld4t0jma5", "fldxndPU23", "fldzfrxHz7", "fldueVvis2",
        SOURCE_LINK_FIELD, "fldSJTQugq", "fldUcLNCyA",
    ]
    run_cli([
        "base", "+view-set-visible-fields", "--base-token", BASE_TOKEN, "--table-id", STAGING_TABLE_ID,
        "--view-id", VIEW_ID, "--json", json.dumps({"visible_fields": ordered_fields}), "--as", IDENTITY,
    ])
    run_cli([
        "base", "+view-set-sort", "--base-token", BASE_TOKEN, "--table-id", STAGING_TABLE_ID,
        "--view-id", VIEW_ID, "--json", json.dumps({"sort_config": [{"field": PRIMARY_MODEL_FIELD, "desc": False}]}),
        "--as", IDENTITY,
    ])
    log(f"字段迁移完成：处理 {len(targets)} 条施工记录")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="施工表 Datasheet 云盘同步器")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="只检查需要同步的附件，不写云盘或多维表格")
    group.add_argument("--sync", action="store_true", help="只同步发生变化的关联 Datasheet 附件")
    group.add_argument("--migrate-fields", action="store_true", help="一次性交换字段并将分类转为单选")
    args = parser.parse_args()
    require_config()
    if args.migrate_fields:
        return migrate_fields()
    return sync(dry_run=args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
