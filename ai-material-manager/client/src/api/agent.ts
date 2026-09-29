import { axiosForBackend } from "@client/src/lib/api-client";
import type {
  AgentConnectionInfo,
  AgentTokenCreateRequest,
  AgentTokenCreateResponse,
  AgentTokenListResponse,
} from "@shared/agent";

export async function getAgentConnection(): Promise<AgentConnectionInfo> {
  const resp = await axiosForBackend.get<AgentConnectionInfo>(
    "/api/agent/connection",
  );
  return resp.data;
}

export async function listAgentTokens(): Promise<AgentTokenListResponse> {
  const resp = await axiosForBackend.get<AgentTokenListResponse>(
    "/api/agent/tokens",
  );
  return resp.data;
}

export async function createAgentToken(
  body: AgentTokenCreateRequest,
): Promise<AgentTokenCreateResponse> {
  const resp = await axiosForBackend.post<AgentTokenCreateResponse>(
    "/api/agent/tokens",
    body,
  );
  return resp.data;
}

export async function revokeAgentToken(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/agent/tokens/${encodeURIComponent(id)}`);
}
