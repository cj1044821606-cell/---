import { axiosForBackend } from "@client/src/lib/api-client";
import type { PrereleaseReviewResponse } from "@shared/prerelease";

/** 策划人及审核人：预发布 → 正式发布 */
export async function approvePrerelease(
  materialId: string,
): Promise<PrereleaseReviewResponse> {
  const resp = await axiosForBackend.post<PrereleaseReviewResponse>(
    `/api/prerelease/${encodeURIComponent(materialId)}/approve`,
  );
  return resp.data;
}

/** 策划人及审核人：驳回并下架（必须写原因） */
export async function rejectPrerelease(
  materialId: string,
  reason: string,
): Promise<PrereleaseReviewResponse> {
  const resp = await axiosForBackend.post<PrereleaseReviewResponse>(
    `/api/prerelease/${encodeURIComponent(materialId)}/reject`,
    { reason },
  );
  return resp.data;
}
