#!/usr/bin/env bash
# ============================================================
# 云盘上传监听器（自监督版，不依赖 systemd）
# 订阅 im.message.receive_v1，收到含「[云盘上传]」标记的消息 →
# 从消息里提取 record_id → 调 drive_uploader.py 上传云盘并回写链接。
#
# 适配容器/K8s Pod 环境（无 init/systemd）：
#  - 自带单实例锁(flock)，重复启动无副作用，可被 TClaw 每次启动安全地重新拉起。
#  - 有界 consume(--timeout) + 外层 while 重连：既躲开「无界 consume 遇 stdin EOF 秒退」，
#    又能在断线/超时后自动重连，替代 systemd 的 Restart=always。
# 注意：Pod 重启会杀掉本进程，需由 TClaw 启动流程或平台重新拉起（见安装提示词）。
# ============================================================
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$DIR/drive_upload.env"

mkdir -p "$WORK_DIR"
: "${LARK_CLI:=lark-cli}"
: "${LISTEN_IDENTITY:=bot}"
: "${CONSUME_TIMEOUT:=3600}"   # 每轮有界运行时长(秒)，到点优雅退出后重连

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"; }

# ---- 单实例锁：重复启动直接退出，让「TClaw 每次启动都拉一下」安全幂等 ----
LOCK="$WORK_DIR/listener.lock"
exec 9>"$LOCK"
if command -v flock >/dev/null 2>&1; then
  flock -n 9 || { echo "监听器已在运行，跳过本次启动"; exit 0; }
fi

# 用 contains(字面子串) 而非 test(正则)：当前 lark-cli 的 jq 对该正则写法报错
if [ -n "${TRIGGER_CHAT_ID:-}" ]; then
  JQ="select(((.content // \"\") | contains(\"$TRIGGER_MARKER\")) and (.chat_id == \"$TRIGGER_CHAT_ID\")) | .content"
else
  JQ="select((.content // \"\") | contains(\"$TRIGGER_MARKER\")) | .content"
fi

log "监听器启动（身份=$LISTEN_IDENTITY，标记=$TRIGGER_MARKER，会话=${TRIGGER_CHAT_ID:-不限}，轮时长=${CONSUME_TIMEOUT}s）"

handle_line() {
  local line="$1"
  [ -z "$line" ] && return
  local rid
  rid=$(printf '%s' "$line" | grep -oE 'rec[0-9A-Za-z]{6,}' | head -n1)
  if [ -z "$rid" ]; then
    log "触发消息未解析到 record_id，原文: ${line:0:200}"
    return
  fi
  log "触发 → record_id=$rid"
  if python3 "$DIR/drive_uploader.py" "$rid" >>"$LOG_FILE" 2>&1; then
    log "完成 record_id=$rid"
  else
    log "❌ 上传器失败 record_id=$rid（详见日志）"
  fi
}

# ---- 重连主循环 ----
while true; do
  # 有界运行：--timeout 时 stdin EOF 被忽略，故可安全用 </dev/null，无需 tail 兜底
  while IFS= read -r line; do
    handle_line "$line"
  done < <("$LARK_CLI" event consume im.message.receive_v1 \
              --as "$LISTEN_IDENTITY" --timeout "${CONSUME_TIMEOUT}s" --jq "$JQ" </dev/null)
  log "consume 本轮结束（超时/断线），3s 后重连"
  sleep 3
done
