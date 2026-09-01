import { axiosForBackend } from "@client/src/lib/api-client";
import type { SystemSettings } from "@shared/api.interface";

export async function getSystemSettings(): Promise<SystemSettings> {
  const response = await axiosForBackend({
    url: "/api/system-settings",
    method: "GET",
  });
  return response.data as SystemSettings;
}
