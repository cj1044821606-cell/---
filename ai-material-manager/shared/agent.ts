/** Agent 接入：个人访问令牌（给本机 AI 助手通过 MCP 调用本系统） */

export const AGENT_TOKEN_TTL_OPTIONS = [30, 90, 180] as const;
export type AgentTokenTtlDays = (typeof AGENT_TOKEN_TTL_OPTIONS)[number];

export interface AgentTokenItem {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
}

export interface AgentTokenListResponse {
  items: AgentTokenItem[];
  /** 当前用户最多可同时持有的有效令牌数 */
  limit: number;
}

export interface AgentTokenCreateRequest {
  label: string;
  ttlDays: AgentTokenTtlDays;
}

export interface AgentTokenCreateResponse {
  /** 完整令牌只在创建时返回一次，服务端只保存其编号 */
  token: string;
  item: AgentTokenItem;
}

export interface AgentConnectionInfo {
  /** MCP 服务地址（Streamable HTTP） */
  mcpUrl: string;
  /** 在 AI 助手里显示的服务名 */
  serverName: string;
  /** Skill 压缩包下载地址（需网页登录） */
  skillDownloadUrl: string;
}
