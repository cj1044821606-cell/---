export type GroupQrStatus = "available" | "expiring" | "expired" | "unavailable";

export const GROUP_QR_EXPIRING_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function getGroupQrStatus(
  enabled: boolean,
  hasImage: boolean,
  expiryMs: number | null,
  nowMs: number = Date.now(),
): GroupQrStatus {
  if (!enabled || !hasImage) return "unavailable";
  if (expiryMs === null) return "available";
  if (!Number.isFinite(expiryMs)) return "unavailable";
  if (expiryMs <= nowMs) return "expired";
  if (expiryMs - nowMs <= GROUP_QR_EXPIRING_WINDOW_MS) return "expiring";
  return "available";
}

export interface SystemSettings {
  groupQrUrl: string | null;
  groupQrExpiry: string | null;
  groupQrStatus: GroupQrStatus;
  uploadFormUrl: string | null;
  syncDelayHint: string;
}
