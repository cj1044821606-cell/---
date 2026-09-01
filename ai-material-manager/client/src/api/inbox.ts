import { axiosForBackend } from "@client/src/lib/api-client";
import type { InboxResponse } from "@shared/inbox";

/** 获取当前用户的待办卡片聚合列表 */
export async function getInbox(): Promise<InboxResponse> {
  const response = await axiosForBackend({
    url: "/api/inbox",
    method: "GET",
  });
  return response.data as InboxResponse;
}
