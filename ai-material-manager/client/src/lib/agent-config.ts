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
