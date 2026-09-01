import { axiosForBackend } from "@client/src/lib/api-client";
import type { Identity } from "@shared/api.interface";

export async function getIdentity(): Promise<Identity> {
  const response = await axiosForBackend({
    url: "/api/identity",
    method: "GET",
  });
  return response.data as Identity;
}
