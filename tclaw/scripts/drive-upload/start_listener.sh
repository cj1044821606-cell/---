#!/usr/bin/env bash
# 以 detached 方式拉起监听器（容器/无 systemd 环境用）。
# 幂等：监听器自带 flock 单实例锁，重复调用不会起第二个。
# 可放进 TClaw 的「每次启动」流程，或 /app/entrypoint.sh 里 exec 主进程之前。
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$DIR/drive_upload.env" 2>/dev/null || true

# ⚠️ 安全闸：监听器会抢「一个 app 全局唯一的 event bus」，与 OpenClaw 自身收 @/群消息冲突，
# 会导致 TClaw 在群里失联。默认禁止启动。仅当改用独立 app 承载事件、确认不冲突时，
# 才用 ENABLE_LISTENER=1 bash start_listener.sh 显式启用。
if [ "${ENABLE_LISTENER:-0}" != "1" ]; then
  echo "[start_listener] 已禁用：监听器会抢占 event bus，导致 TClaw 群内失联。"
  echo "[start_listener] 云盘上传请只用 sweep：python3 $DIR/drive_uploader.py --sweep"
  echo "[start_listener] 如确需启用，请 ENABLE_LISTENER=1 显式运行。"
  exit 0
fi
mkdir -p "${WORK_DIR:=/tmp/drive_uploader}"
nohup bash "$DIR/drive_upload_listener.sh" >>"${LOG_FILE:-$WORK_DIR/uploader.log}" 2>&1 &
disown 2>/dev/null || true
echo "listener launched (detached). log: ${LOG_FILE:-$WORK_DIR/uploader.log}"
