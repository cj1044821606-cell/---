import { axiosForBackend } from "@client/src/lib/api-client";
import type { MaterialFilesResponse, KitFilesResponse } from "@shared/files";

export async function getMaterialFiles(
  baseRecordId: string,
): Promise<MaterialFilesResponse> {
  const { data } = await axiosForBackend.get(
    `/api/materials/${baseRecordId}/files`,
  );
  return data as MaterialFilesResponse;
}

export async function getKitFiles(
  productModel: string,
): Promise<KitFilesResponse> {
  const { data } = await axiosForBackend.get(
    `/api/material-kits/${encodeURIComponent(productModel)}/files`,
  );
  return data as KitFilesResponse;
}
