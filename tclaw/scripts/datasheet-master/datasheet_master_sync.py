#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""产品 Datasheet 总汇总同步器。

从罗颖华、柯惠君、Sam 三张来源表只读汇总产品 Datasheet；按固定优先级
罗颖华 > 柯惠君 > Sam 选择当前资料，并补齐总表的附件与云盘链接。

用法：
  python3 datasheet_master_sync.py --dry-run
  python3 datasheet_master_sync.py --sync

此脚本不会回写三张来源表，也不订阅飞书消息事件。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


HERE = Path(__file__).resolve().parent


def load_env(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    if not path.exists():
        return result
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
        result[key.strip()] = value
    return result


ENV = load_env(HERE / "datasheet_master.env")
BASE_TOKEN = ENV.get("BASE_TOKEN", "")
MASTER_TABLE_ID = ENV.get("MASTER_TABLE_ID", "")
DRIVE_FOLDER_TOKEN = ENV.get("DRIVE_FOLDER_TOKEN", "")
DOMAIN = ENV.get("FEISHU_DOMAIN", "transsioner.feishu.cn")
IDENTITY = ENV.get("IDENTITY", "user")
LARK = ENV.get("LARK_CLI", "lark-cli")
WORK_DIR = HERE / ENV.get("WORK_DIR", ".datasheet_master_work")
LOCK_PATH = WORK_DIR / "sync.lock"

SOURCES = [
    {
        "name": "罗颖华",
        "priority": 1,
        "table": ENV.get("LUO_TABLE_ID", ""),
        "model": "Product Model",
        "attachment": "Datasheet文件",
        "asset_name": "Datesheet文件名",
        "status": None,
        "application_field": None,
        "default_application": "C&I",
        "brand": None,
        "source_type": "luo",
    },
    {
        "name": "柯惠君",
        "priority": 2,
        "table": ENV.get("KE_TABLE_ID", ""),
        "model": "产品型号",
        "attachment": None,
        "asset_name": None,
        "status": "GLobal状态",
        "application_field": "画册板块",
        "default_application": "未标注",
        "brand": "品牌",
        "url": "最新版 Datasheet",
        "source_type": "ke",
    },
    {
        "name": "Sam",
        "priority": 3,
        "table": ENV.get("SAM_TABLE_ID", ""),
        "model": "产品型号",
        "attachment": None,
        "asset_name": "Datasheet文件名",
        "status": "产品状态",
        "application_field": "产品分类",
        "default_application": "未标注",
        "brand": None,
        "url": "Datasheet链接",
        "source_type": "sam",
    },
]

MASTER_FIELDS = [
    "产品型号", "品牌", "产品类型", "应用方向", "Datasheet 附件", "云盘链接",
    "产品状态", "来源", "来源指纹", "同步状态", "最近同步时间", "当前资料指纹",
]


def log(message: str) -> None:
    print(f"[{datetime.now():%F %T}] {message}", flush=True)


def require_config() -> None:
    required = {
        "BASE_TOKEN": BASE_TOKEN,
        "MASTER_TABLE_ID": MASTER_TABLE_ID,
        "DRIVE_FOLDER_TOKEN": DRIVE_FOLDER_TOKEN,
        "LUO_TABLE_ID": SOURCES[0]["table"],
        "KE_TABLE_ID": SOURCES[1]["table"],
        "SAM_TABLE_ID": SOURCES[2]["table"],
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError("缺少配置：" + ", ".join(missing))


def run_cli(args: list[str], *, json_result: bool = True) -> Any:
    command = [LARK, *args]
    if json_result and "--format" not in args:
        command.extend(["--format", "json"])
    proc = subprocess.run(command, cwd=HERE, text=True, capture_output=True)
    stdout = proc.stdout.strip()
    stderr = proc.stderr.strip()
    if not json_result:
        if proc.returncode:
            raise RuntimeError(proc.stderr.strip() or stdout)
        return stdout
    combined = "\n".join(part for part in (stdout, stderr) if part)
    start = combined.find("{")
    if start < 0:
        raise RuntimeError(f"lark-cli 非 JSON 输出：{combined[:400]}")
    payload, _ = json.JSONDecoder().raw_decode(combined[start:])
    if proc.returncode or payload.get("ok") is False:
        error = payload.get("error", {})
        raise RuntimeError(error.get("message") or stderr or str(payload))
    return payload["data"]


def as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                parts.append(str(item.get("text") or item.get("link") or ""))
            else:
                parts.append(str(item))
        return "".join(parts)
    return str(value)


def first_option(value: Any) -> str:
    if isinstance(value, list):
        return as_text(value[0]) if value else ""
    return as_text(value)


def markdown_url(value: Any) -> str:
    text = as_text(value).strip()
    match = re.search(r"\]\((https?://[^)]+)\)", text)
    if match:
        return match.group(1)
    match = re.search(r"https?://\S+", text)
    return match.group(0).rstrip(")]〉") if match else ""


def normalize_model(raw: str) -> str:
    value = raw.replace("\u3000", " ").strip()
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"\bUPRO\b", "U Pro", value, flags=re.I)
    value = re.sub(r"\bPRO\b", "Pro", value, flags=re.I)
    return value


def split_models(raw: str) -> list[str]:
    clean = re.sub(r"(?:\n|\s)+(?:EOL|退市).*", "", raw, flags=re.I)
    protected: dict[str, str] = {}
    def protect_pv(match: re.Match[str]) -> str:
        key = f"__PV_{len(protected)}__"
        protected[key] = match.group(0)
        return key
    clean = re.sub(r"\b\d{3,4}W/N\b", protect_pv, clean, flags=re.I)
    pieces = re.split(r"\s*(?:/|&|\n|，|,)\s*", clean)
    models = [normalize_model(protected.get(piece, piece)) for piece in pieces if normalize_model(protected.get(piece, piece))]
    return list(dict.fromkeys(models))


def classify(model: str, source_type: str) -> tuple[str, str, str]:
    upper = model.upper().replace(" ", "")
    if upper.startswith(("IPV-", "IHY-", "IGT-")):
        product_type = "逆变器"
    elif upper.startswith(("IPL-", "IPW-", "IPB-", "IPX-", "IB-")):
        product_type = "电池"
    elif upper.startswith(("IESS-", "DC-")):
        product_type = "一体机"
    elif upper.startswith("ISP-") or re.fullmatch(r"\d{3,4}W/N", upper):
        product_type = "光伏板"
    else:
        product_type = "其他"
    brand = "DYQUE" if upper.startswith("DC-") else ("itel Energy" if upper.startswith("I") else "未标注")
    application = "未标注"
    if source_type == "luo":
        application = "C&I"
    return product_type, brand, application


def source_application(source: dict[str, Any], row: dict[str, Any], fallback: str) -> str:
    marker = first_option(row.get(source.get("application_field") or "")).lower()
    if "c&i" in marker or "c\u0026i" in marker:
        return "C&I"
    if "all-in-one" in marker or "aio" in marker:
        return "便携"
    return source.get("default_application") or fallback


def source_rows(source: dict[str, Any]) -> list[dict[str, Any]]:
    fields = [source["model"]]
    for key in ("attachment", "asset_name", "status", "application_field", "brand", "url"):
        value = source.get(key)
        if value and value not in fields:
            fields.append(value)
    result: list[dict[str, Any]] = []
    offset = 0
    while True:
        args = ["base", "+record-list", "--base-token", BASE_TOKEN, "--table-id", source["table"], "--offset", str(offset), "--limit", "200", "--as", IDENTITY]
        for field in fields:
            args.extend(["--field-id", field])
        data = run_cli(args)
        names = data.get("fields") or []
        for record_id, values in zip(data.get("record_id_list") or [], data.get("data") or []):
            result.append({"record_id": record_id, **dict(zip(names, values))})
        if not data.get("has_more"):
            break
        offset += len(data.get("record_id_list") or [])
    return result


def build_candidates() -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for source in SOURCES:
        rows = source_rows(source)
        log(f"读取 {source['name']}：{len(rows)} 条记录")
        for row in rows:
            raw_model = as_text(row.get(source["model"])).strip()
            if not raw_model:
                continue
            attachment = row.get(source.get("attachment") or "") if source.get("attachment") else None
            url = markdown_url(row.get(source.get("url") or "")) if source.get("url") else ""
            file_name = as_text(row.get(source.get("asset_name") or "")).strip()
            status = first_option(row.get(source.get("status") or "")) if source.get("status") else "未标注"
            if re.search(r"EOL|退市", raw_model, re.I):
                status = "EOL / 退市"
            for model in split_models(raw_model):
                product_type, inferred_brand, inferred_application = classify(model, source["source_type"])
                candidate = {
                    "model": model,
                    "source": source["name"],
                    "priority": source["priority"],
                    "source_table": source["table"],
                    "source_record": row["record_id"],
                    "product_type": product_type,
                    "brand": first_option(row.get(source.get("brand") or "")) or inferred_brand,
                    "application": source_application(source, row, inferred_application),
                    "status": status or "未标注",
                    "attachment": attachment if isinstance(attachment, list) else [],
                    "url": url,
                    "file_name": file_name,
                }
                asset_key = json.dumps({"a": candidate["attachment"], "u": url, "n": file_name}, ensure_ascii=False, sort_keys=True)
                candidate["asset_fingerprint"] = hashlib.sha256(asset_key.encode()).hexdigest()
                grouped[model].append(candidate)
    return grouped


def selected_candidate(candidates: Iterable[dict[str, Any]]) -> dict[str, Any]:
    ordered = sorted(candidates, key=lambda item: item["priority"])
    return next((item for item in ordered if item["attachment"] or file_token_from_url(item["url"])), ordered[0])


def all_master_rows() -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    offset = 0
    while True:
        args = ["base", "+record-list", "--base-token", BASE_TOKEN, "--table-id", MASTER_TABLE_ID, "--offset", str(offset), "--limit", "200", "--as", IDENTITY]
        for field in MASTER_FIELDS:
            args.extend(["--field-id", field])
        data = run_cli(args)
        names = data.get("fields") or []
        for record_id, values in zip(data.get("record_id_list") or [], data.get("data") or []):
            row = dict(zip(names, values))
            model = normalize_model(as_text(row.get("产品型号")))
            if model:
                rows[model] = {"record_id": record_id, **row}
        if not data.get("has_more"):
            break
        offset += len(data.get("record_id_list") or [])
    return rows


def find_master_record_id(model: str) -> str | None:
    data = run_cli([
        "base", "+record-list", "--base-token", BASE_TOKEN, "--table-id", MASTER_TABLE_ID,
        "--filter-json", json.dumps({"logic": "and", "conditions": [["产品型号", "==", model]]}, ensure_ascii=False),
        "--field-id", "产品型号", "--limit", "2", "--as", IDENTITY,
    ])
    ids = data.get("record_id_list") or []
    return ids[0] if ids else None


def record_upsert(record_id: str | None, values: dict[str, Any], dry_run: bool) -> str | None:
    if dry_run:
        return record_id
    args = ["base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", MASTER_TABLE_ID, "--json", json.dumps(values, ensure_ascii=False), "--as", IDENTITY]
    if record_id:
        args.extend(["--record-id", record_id])
    data = run_cli(args)
    record = data.get("record") or {}
    return record_id or record.get("record_id") or record.get("id") or find_master_record_id(as_text(values.get("产品型号")))


def attachment_present(row: dict[str, Any]) -> bool:
    return bool(row.get("Datasheet 附件"))


def file_token_from_url(url: str) -> str:
    match = re.search(r"/file/([^/?#]+)", url)
    return match.group(1) if match else ""


def one_temp_file(name: str) -> Path:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="datasheet_", dir=WORK_DIR))
    return temp_dir / Path(name).name


def cli_path(path: Path) -> str:
    return str(path.resolve().relative_to(HERE))


def download_selected_asset(candidate: dict[str, Any]) -> tuple[Path, str]:
    attachments = candidate["attachment"]
    if attachments:
        attachment = next((item for item in attachments if isinstance(item, dict) and item.get("file_token")), None)
        if not attachment:
            raise RuntimeError("来源附件缺少 file_token")
        name = attachment.get("name") or candidate["file_name"] or "datasheet.pdf"
        temp = one_temp_file(name)
        run_cli([
            "base", "+record-download-attachment", "--base-token", BASE_TOKEN,
            "--table-id", candidate["source_table"], "--record-id", candidate["source_record"],
            "--file-token", attachment["file_token"], "--output", cli_path(temp), "--overwrite", "--as", IDENTITY,
        ])
        return temp, name
    token = file_token_from_url(candidate["url"])
    if not token:
        raise RuntimeError("云盘链接不是可下载的 /file/ 链接")
    name = candidate["file_name"] or f"{candidate['model']}.pdf"
    temp = one_temp_file(name)
    run_cli(["drive", "+download", "--file-token", token, "--output", cli_path(temp), "--overwrite", "--as", IDENTITY])
    return temp, name


def upload_master_attachment(record_id: str, local_file: Path, display_name: str) -> None:
    run_cli([
        "base", "+record-upload-attachment", "--base-token", BASE_TOKEN, "--table-id", MASTER_TABLE_ID,
        "--record-id", record_id, "--field-id", "Datasheet 附件", "--file", cli_path(local_file), "--as", IDENTITY,
    ])


def upload_drive(local_file: Path, display_name: str) -> str:
    data = run_cli([
        "drive", "+upload", "--file", cli_path(local_file), "--folder-token", DRIVE_FOLDER_TOKEN,
        "--name", display_name, "--as", IDENTITY,
    ])
    serialized = json.dumps(data, ensure_ascii=False)
    match = re.search(r'"file_token"\s*:\s*"([^"]+)"', serialized)
    if not match:
        raise RuntimeError("云盘上传未返回 file_token")
    return f"https://{DOMAIN}/file/{match.group(1)}"


def mirror_asset(record_id: str, master: dict[str, Any], candidate: dict[str, Any], dry_run: bool) -> str:
    existing_link = markdown_url(master.get("云盘链接"))
    if not candidate["attachment"] and not file_token_from_url(candidate["url"]):
        return existing_link
    needs_attachment = not attachment_present(master)
    needs_new_version = as_text(master.get("当前资料指纹")) != candidate["asset_fingerprint"]
    needs_link = not existing_link
    if not (needs_attachment or needs_new_version or needs_link):
        return existing_link
    if dry_run:
        return candidate["url"] or "<待上传云盘>"
    local_file: Path | None = None
    try:
        local_file, name = download_selected_asset(candidate)
        if needs_attachment or needs_new_version:
            upload_master_attachment(record_id, local_file, name)
        if candidate["url"]:
            return candidate["url"]
        return upload_drive(local_file, name)
    finally:
        if local_file and local_file.exists():
            local_file.unlink()
            local_file.parent.rmdir()


def sync(dry_run: bool, offset: int = 0, limit: int = 0) -> int:
    candidates_by_model = build_candidates()
    master_by_model = all_master_rows()
    # 修正首次同步旧版本把 585W/N 误拆成 585W 的四条主键；只改明确的单条记录，不删除数据。
    legacy_pv = {"585W": "585W/N", "590W": "590W/N", "610W": "610W/N", "620W": "620W/N"}
    for old_model, new_model in legacy_pv.items():
        if old_model in master_by_model and new_model not in master_by_model:
            record_id = master_by_model[old_model]["record_id"]
            if not dry_run:
                record_upsert(record_id, {"产品型号": new_model}, False)
            master_by_model[new_model] = {**master_by_model.pop(old_model), "产品型号": new_model}
    created = updated = failures = 0
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    models = sorted(candidates_by_model)
    if offset:
        models = models[offset:]
    if limit:
        models = models[:limit]
    for model in models:
        candidates = candidates_by_model[model]
        selected = selected_candidate(candidates)
        all_sources = [item["source"] for item in sorted(candidates, key=lambda item: item["priority"])]
        source_fingerprint = hashlib.sha256(json.dumps(candidates, ensure_ascii=False, sort_keys=True, default=str).encode()).hexdigest()
        existing = master_by_model.get(model, {})
        record_id = existing.get("record_id")
        has_asset = bool(selected["attachment"] or file_token_from_url(selected["url"]))
        sync_status = "待确认" if selected["product_type"] == "其他" or not has_asset else "正常"
        values: dict[str, Any] = {
            "产品型号": model,
            "品牌": selected["brand"] if selected["brand"] in {"itel Energy", "DYQUE"} else "未标注",
            "产品类型": selected["product_type"],
            "应用方向": selected["application"],
            "产品状态": selected["status"] if selected["status"] in {"可推", "TBD", "停用", "EOL / 退市"} else "未标注",
            "来源": list(dict.fromkeys(all_sources)),
            "来源指纹": source_fingerprint,
            "同步状态": sync_status,
            "最近同步时间": now,
            "当前资料指纹": selected["asset_fingerprint"],
        }
        # 先保留来源云盘链接；即使后续下载附件因权限或文件失效失败，用户仍可看到原始资料线索。
        if file_token_from_url(selected["url"]):
            values["云盘链接"] = selected["url"]
        try:
            record_id = record_upsert(record_id, values, dry_run)
            if not record_id and not dry_run:
                raise RuntimeError("未获取总表 record_id")
            link = mirror_asset(record_id or "<dry-run>", existing, selected, dry_run)
            if link:
                record_upsert(record_id, {"云盘链接": link, "当前资料指纹": selected["asset_fingerprint"], "同步状态": sync_status, "最近同步时间": now}, dry_run)
            if existing:
                updated += 1
            else:
                created += 1
        except Exception as exc:
            failures += 1
            log(f"❌ {model}: {exc}")
            if record_id and not dry_run:
                try:
                    record_upsert(record_id, {"同步状态": "失败", "最近同步时间": now}, False)
                except Exception as status_error:
                    log(f"  ⚠ 无法写入失败状态：{status_error}")
    log(f"完成：新增 {created}，更新 {updated}，失败 {failures}，本次型号 {len(models)}/{len(candidates_by_model)}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="产品 Datasheet 总汇总同步器")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--sync", action="store_true", help="执行同步与资料补齐")
    group.add_argument("--dry-run", action="store_true", help="仅读取来源并输出计划")
    parser.add_argument("--offset", type=int, default=0, help="从排序后的第几条型号开始；用于分批恢复")
    parser.add_argument("--limit", type=int, default=0, help="本次最多处理多少型号；0 代表全部")
    args = parser.parse_args()
    require_config()
    if args.offset < 0 or args.limit < 0:
        parser.error("--offset 与 --limit 不能为负数")
    return sync(args.dry_run, args.offset, args.limit)


if __name__ == "__main__":
    sys.exit(main())
