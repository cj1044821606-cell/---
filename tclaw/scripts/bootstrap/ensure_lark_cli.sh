#!/usr/bin/env bash
# 持久化安装 / 修复 lark-cli
#
# 背景：
# - TClaw 运行在容器化 VM/Pod 中，普通 npm 全局目录、临时目录、部分工作目录可能在重启/清理后丢失。
# - /home/node/.openclaw 是已知持久化目录，所以把 lark-cli 固定安装到这里。
# - 官方安装方式来自 Lark CLI：npm install -g @larksuite/cli
#
# 用法：
#   bash scripts/bootstrap/ensure_lark_cli.sh
#   bash scripts/bootstrap/ensure_lark_cli.sh --print-path
#   bash scripts/bootstrap/ensure_lark_cli.sh --check-only
#   bash scripts/bootstrap/ensure_lark_cli.sh --auth-check
#
# 环境变量：
#   OPENCLAW_HOME=/home/node/.openclaw
#   LARK_CLI_PERSIST_PREFIX=/home/node/.openclaw/npm-global
#   LARK_CLI_NPM_PACKAGE=@larksuite/cli@latest
#   INSTALL_LARK_CLI_SKILLS=1   # 可选：额外安装 lark-cli skills，失败不影响 CLI 主体

set -euo pipefail

MODE="${1:---ensure}"
OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
PREFIX="${LARK_CLI_PERSIST_PREFIX:-${OPENCLAW_HOME}/npm-global}"
BIN="${LARK_CLI_PERSIST_BIN:-${PREFIX}/bin/lark-cli}"
NPM_PACKAGE="${LARK_CLI_NPM_PACKAGE:-@larksuite/cli@latest}"

export npm_config_prefix="${PREFIX}"
export NPM_CONFIG_PREFIX="${PREFIX}"
export npm_config_ignore_scripts=false
export NPM_CONFIG_IGNORE_SCRIPTS=false
export PATH="${PREFIX}/bin:${PATH}"

say() {
  printf '%s\n' "$*"
}

has_working_lark_cli() {
  if [[ ! -x "${BIN}" ]]; then
    return 1
  fi
  "${BIN}" --version >/dev/null 2>&1
}

install_lark_cli() {
  if ! command -v node >/dev/null 2>&1; then
    say "ERROR: node 不存在，无法安装 lark-cli"
    exit 11
  fi
  if ! command -v npm >/dev/null 2>&1; then
    say "ERROR: npm 不存在，无法安装 lark-cli"
    exit 12
  fi

  mkdir -p "${OPENCLAW_HOME}" "${PREFIX}" "${PREFIX}/bin"

  say "Installing lark-cli into persistent prefix: ${PREFIX}"
  npm install -g --prefix "${PREFIX}" --ignore-scripts=false "${NPM_PACKAGE}"

  if ! has_working_lark_cli; then
    say "ERROR: 安装完成但 ${BIN} 仍不可执行，检查 npm postinstall / 网络 / 权限"
    exit 13
  fi

  if [[ "${INSTALL_LARK_CLI_SKILLS:-0}" == "1" ]] && command -v npx >/dev/null 2>&1; then
    say "Installing lark-cli skills, best effort..."
    PATH="${PREFIX}/bin:${PATH}" npx -y skills add https://github.com/larksuite/cli -y -g || true
  fi
}

case "${MODE}" in
  --check-only)
    if has_working_lark_cli; then
      "${BIN}" --version
      say "${BIN}"
      exit 0
    fi
    say "MISSING: ${BIN}"
    exit 2
    ;;
  --auth-check)
    if ! has_working_lark_cli; then
      install_lark_cli
    fi
    if "${BIN}" auth status; then
      exit 0
    fi
    say "AUTH_REQUIRED: 请让 Alan 在 TClaw 当前环境里重新完成 lark-cli 用户授权。"
    exit 20
    ;;
  --print-path)
    if ! has_working_lark_cli; then
      install_lark_cli
    fi
    say "${BIN}"
    ;;
  --ensure)
    if ! has_working_lark_cli; then
      install_lark_cli
    fi
    "${BIN}" --version
    say "OK: ${BIN}"
    ;;
  *)
    say "Usage: $0 [--ensure|--print-path|--check-only|--auth-check]"
    exit 64
    ;;
esac
