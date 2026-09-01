# TClaw 远端同步提示词：后台模型切 TranAI + lark-cli 持久化自愈

请在 TClaw 当前远端 VM/Pod 环境中执行以下维护。目标有两个：

1. 把所有后台定时任务/巡检/sweep 的模型消耗从 TokenSell GPT-5.5 转到 TranAI。
2. 把 lark-cli 固定安装到不会被清理的 `/home/node/.openclaw` 路径，并在找不到时自动重装。

执行前请先备份，不要批量删除任何文件或目录。

## 一、先备份

```bash
cd /home/node/.openclaw 2>/dev/null || cd ~/workspace-main 2>/dev/null || pwd
mkdir -p backups
ts="$(date +%Y%m%d%H%M%S)"

# 如果这些文件/目录存在，就逐个复制；不存在不要报错中断
[ -f openclaw.json ] && cp openclaw.json "backups/openclaw.json.${ts}.bak"
[ -f AGENTS.md ] && cp AGENTS.md "backups/AGENTS.md.${ts}.bak"
[ -d cron ] && tar -czf "backups/cron.${ts}.tgz" cron
[ -d scripts ] && tar -czf "backups/scripts.${ts}.tgz" scripts
```

## 二、确认当前配置位置

请检查这些位置里是否有模型、定时任务或 lark-cli 配置：

```bash
pwd
find . -maxdepth 4 -type f \( -name 'openclaw.json' -o -name '*.json' -o -name '*.md' -o -name '*.sh' -o -name '*.env' -o -name '*.py' \) \
  | xargs grep -nE 'tokensell|gpt-5\.5|tranai|qwen|cron|schedule|定时|lark-cli|drive_uploader|--sweep' 2>/dev/null || true
```

## 三、安装/修复 lark-cli 到持久路径

创建文件：`scripts/bootstrap/ensure_lark_cli.sh`

```bash
mkdir -p scripts/bootstrap
```

写入以下内容：

```bash
#!/usr/bin/env bash
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

say() { printf '%s\n' "$*"; }

has_working_lark_cli() {
  if [[ ! -x "${BIN}" ]]; then return 1; fi
  "${BIN}" --version >/dev/null 2>&1
}

install_lark_cli() {
  command -v node >/dev/null 2>&1 || { say "ERROR: node 不存在"; exit 11; }
  command -v npm >/dev/null 2>&1 || { say "ERROR: npm 不存在"; exit 12; }
  mkdir -p "${OPENCLAW_HOME}" "${PREFIX}" "${PREFIX}/bin"
  say "Installing lark-cli into persistent prefix: ${PREFIX}"
  npm install -g --prefix "${PREFIX}" --ignore-scripts=false "${NPM_PACKAGE}"
  has_working_lark_cli || { say "ERROR: 安装后 ${BIN} 仍不可用"; exit 13; }
}

case "${MODE}" in
  --check-only)
    has_working_lark_cli && { "${BIN}" --version; say "${BIN}"; exit 0; }
    say "MISSING: ${BIN}"; exit 2 ;;
  --auth-check)
    has_working_lark_cli || install_lark_cli
    "${BIN}" auth status || { say "AUTH_REQUIRED: 请让 Alan 授权"; exit 20; } ;;
  --print-path)
    has_working_lark_cli || install_lark_cli
    say "${BIN}" ;;
  --ensure)
    has_working_lark_cli || install_lark_cli
    "${BIN}" --version
    say "OK: ${BIN}" ;;
  *)
    say "Usage: $0 [--ensure|--print-path|--check-only|--auth-check]"; exit 64 ;;
esac
```

然后执行：

```bash
chmod +x scripts/bootstrap/ensure_lark_cli.sh
bash scripts/bootstrap/ensure_lark_cli.sh
bash scripts/bootstrap/ensure_lark_cli.sh --auth-check
```

如果 `--auth-check` 输出 `AUTH_REQUIRED`，请停下来告诉 Alan，需要他在当前 TClaw 环境完成 lark-cli 授权。不要继续做会写 Base/Drive/IM 的动作。

## 四、把云盘上传脚本改成自愈

如果项目里已有 `scripts/drive-upload/drive_upload.env`，请把里面的 lark-cli 路径改成：

```env
LARK_CLI="/home/node/.openclaw/npm-global/bin/lark-cli"
LARK_CLI_PERSIST_BIN="/home/node/.openclaw/npm-global/bin/lark-cli"
```

如果项目里已有 `scripts/drive-upload/drive_uploader.py`，请确认它在找不到 `LARK_CLI` 时会调用：

```bash
bash scripts/bootstrap/ensure_lark_cli.sh --print-path
```

如果没有，请补上这个自愈逻辑；不要只依赖 PATH 里的 `lark-cli`。

## 五、把后台 token 消耗切到 TranAI

请检查 TClaw 的 Agent / cron / schedule 配置。原则如下：

- 人工聊天、`market-connect-test` 主会话：继续 `tokensell-gpt55/gpt-5.5`，思考 `medium`。
- 所有无人值守后台任务：改为 `tranai/tranai-qwen-plus`，思考 `low` 或关闭深度思考。
- 包括但不限于：
  - 主轮询循环
  - drive-upload sweep
  - 巡检任务
  - 失败重试
  - 长时间待确认提醒
  - 自恢复 / 自检类 cron

如果 cron 本身支持模型覆盖，就逐条把 cron 的模型改成 TranAI。

如果 cron 不支持单独覆盖模型，请创建或复用一个后台维护 Agent，例如：

```text
agent id: maintenance-background
model: tranai/tranai-qwen-plus
thinking: low
用途：只给 cron / 后台任务使用
```

然后把所有后台定时任务的触发对象改为这个后台维护 Agent。

注意：

- 不要把 `main` / `market-connect-test` 人工会话改回 TranAI。
- 不要再用 `agents.list[0].model`、`agents.list[1].model` 这种路径写配置，避免生成错误的 `0`、`1` Agent。
- 如果必须修改 JSON，请先完整读取 `agents`，在内存里修改完整对象，再整段写回。

## 六、验收

请逐项回复结果：

1. lark-cli 最终路径：应为 `/home/node/.openclaw/npm-global/bin/lark-cli`
2. `lark-cli --version` 输出
3. `lark-cli auth status` 是否正常；如果需要 Alan 授权，请明确说
4. 已改成 TranAI 的后台 cron/任务清单
5. 保持 GPT-5.5 的人工 Agent 清单
6. 手动触发一个后台任务后的会话模型显示
7. `drive_uploader.py --sweep` 是否能正常启动

最终判断标准：

- 后台任务不再消耗 TokenSell GPT-5.5。
- 人工聊天仍默认 GPT-5.5 Medium。
- lark-cli 即使从 PATH 消失，也能自动恢复到 `/home/node/.openclaw/npm-global/bin/lark-cli`。
