import { axiosForBackend } from "@client/src/lib/api-client";
import type {
  MaterialDetailResponse,
  MaterialEditFields,
  MaterialEditResponse,
  MaterialKitsResponse,
  MaterialListParams,
  MaterialListResponse,
} from "@shared/material";

export async function getMaterialList(
  params: MaterialListParams,
): Promise<MaterialListResponse> {
  const response = await axiosForBackend({
    url: "/api/materials",
    method: "GET",
    params,
  });
  return response.data as MaterialListResponse;
}

export async function getMaterialKits(): Promise<MaterialKitsResponse> {
  const response = await axiosForBackend({
    url: "/api/material-kits",
    method: "GET",
  });
  return response.data as MaterialKitsResponse;
}

export async function getMaterialDetail(
  baseRecordId: string,
): Promise<MaterialDetailResponse> {
  const response = await axiosForBackend({
    url: `/api/materials/${baseRecordId}`,
    method: "GET",
  });
  return response.data as MaterialDetailResponse;
}

export async function updateMaterialFields(
  baseRecordId: string,
  fields: MaterialEditFields,
): Promise<MaterialEditResponse> {
  const response = await axiosForBackend({
    url: `/api/materials/${baseRecordId}`,
    method: "PATCH",
    data: { fields },
  });
  return response.data as MaterialEditResponse;
}
