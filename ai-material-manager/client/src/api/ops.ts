import { axiosForBackend } from "@client/src/lib/api-client";
import type { OpsResponse } from "@shared/api.interface";

export async function getOps(): Promise<OpsResponse> {
  const response = await axiosForBackend({
    url: "/api/ops",
    method: "GET",
  });
  return response.data as OpsResponse;
}
