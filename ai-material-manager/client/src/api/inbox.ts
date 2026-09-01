import { axiosForBackend } from "@client/src/lib/api-client";
import type { InboxAcknowledgeResponse, InboxResponse } from "@shared/inbox";

/** 获取当前用户的待办卡片聚合列表 */
export async function getInbox(): Promise<InboxResponse> {
  const response = await axiosForBackend({
    url: "/api/inbox",
    method: "GET",
  });
  return response.data as InboxResponse;
}

export async function acknowledgeVersionReplaced(
  recordId: string,
): Promise<InboxAcknowledgeResponse> {
  const response = await axiosForBackend({
    url: `/api/inbox/version-replaced/${encodeURIComponent(recordId)}/read`,
    method: "POST",
  });
  return response.data as InboxAcknowledgeResponse;
}
