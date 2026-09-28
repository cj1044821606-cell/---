import type { AgentConnectionInfo } from '@shared/agent';

export const AGENT_TOKEN_PLACEHOLDER = '<你的令牌>';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 非 HTTPS 或权限受限时退回到选区复制
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export interface AgentClientConfigs {
  codex: string;
  claudeCode: string;
  claudeDesktop: string;
  generic: string;
}

/**
 * Codex（命令行 / 桌面 App / IDE 插件）共用 ~/.codex/config.toml。
 * 令牌直接写进 http_headers：桌面 App 从启动台打开时读不到终端里的环境变量，写死最稳。
 */
export function buildCodexConfig(
  info: Pick<AgentConnectionInfo, 'mcpUrl' | 'serverName'>,
  token: string,
): string {
  return [
    `[mcp_servers.${info.serverName}]`,
    `url = "${info.mcpUrl}"`,
    `http_headers = { Authorization = "Bearer ${token}" }`,
  ].join('\n');
}

export function buildAgentConfigs(
  info: AgentConnectionInfo,
  token: string,
): AgentClientConfigs {
  const name = info.serverName;
  return {
    codex: buildCodexConfig(info, token),
    claudeCode: `claude mcp add --transport http ${name} ${info.mcpUrl} --header "Authorization: Bearer ${token}"`,
    claudeDesktop: JSON.stringify(
      {
        mcpServers: {
          [name]: {
            command: 'npx',
            args: [
              '-y',
              'mcp-remote',
              info.mcpUrl,
              '--header',
              'Authorization:${AUTH_HEADER}',
            ],
            env: { AUTH_HEADER: `Bearer ${token}` },
          },
        },
      },
      null,
      2,
    ),
    generic: JSON.stringify(
      {
        mcpServers: {
          [name]: {
            url: info.mcpUrl,
            headers: { Authorization: `Bearer ${token}` },
          },
        },
      },
      null,
      2,
    ),
  };
}

/**
 * 给 AI 助手的“配置口令”：用户整段复制发给 Codex，由 AI 自己改配置文件、下载安装 Skill。
 * 面向完全不懂技术的同事——他们只需要复制、粘贴、点“允许”、重启。
 */
export function buildSetupPrompt(
  info: AgentConnectionInfo,
  token: string,
  language: 'zh' | 'en',
): string {
  const config = buildCodexConfig(info, token);
  const skillUrl = info.skillDownloadUrl;
  if (language === 'en') {
    return `Please connect this computer's Codex to our "Transsion ESS material library" so you can upload, pre-release and find materials for me. Do the steps below automatically, ask me whenever you need permission, and tell me the result in one sentence when you're done.

Step 1 — Configure the MCP server
Open Codex's config file (macOS/Linux: ~/.codex/config.toml; Windows: %USERPROFILE%\\.codex\\config.toml); create it if it doesn't exist. If it already contains a [mcp_servers.${info.serverName}] section, remove that whole section first. Then append these lines at the end and leave everything else unchanged:

${config}

Step 2 — Install the Skill
Download ${skillUrl} with the request header "Authorization: Bearer ${token}" (for example: curl -fL -H "Authorization: Bearer ${token}" -o material-assistant-skill.zip "${skillUrl}"; on Windows use curl.exe). Unzip it into ~/.codex/skills/ (Windows: %USERPROFILE%\\.codex\\skills\\) so that material-assistant/SKILL.md exists.

Step 3 — Finish
Remind me to fully quit and reopen Codex. After it restarts I'll ask you to call the whoami tool to confirm the connection.

Note: the token starting with amm_ is equivalent to my login. Only write it into the config file above — never anywhere else, and never share it.`;
  }
  return `请帮我把这台电脑上的 Codex 接入「传音储能物料管理系统」，以后你就能帮我上传、预发布、查找物料。请按下面的步骤自动完成配置，需要权限时直接向我申请，全部做完后用一句话告诉我结果。

第 1 步：配置 MCP 服务
打开 Codex 的配置文件（macOS / Linux：~/.codex/config.toml；Windows：%USERPROFILE%\\.codex\\config.toml），不存在就新建。如果里面已经有 [mcp_servers.${info.serverName}] 这一段，先把整段删掉；然后在文件末尾追加下面几行，文件里的其他内容保持不变：

${config}

第 2 步：安装 Skill 操作手册
下载 ${skillUrl}，请求时带上请求头「Authorization: Bearer ${token}」（例如：curl -fL -H "Authorization: Bearer ${token}" -o material-assistant-skill.zip "${skillUrl}"；Windows 请用 curl.exe）。把它解压到 ~/.codex/skills/（Windows：%USERPROFILE%\\.codex\\skills\\），确认存在 material-assistant/SKILL.md。

第 3 步：收尾
提醒我完全退出并重新打开 Codex。重新打开后，我会让你调用 whoami 工具确认连接成功。

注意：上面以 amm_ 开头的令牌等同于我的登录身份，只能写进上面这个配置文件，不要写到别处，也不要发给任何人。`;
}
