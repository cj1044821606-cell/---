import type { GroupQrStatus } from "./settings";

export interface OpsStuckItem {
  id: string;
  originalFileName: string;
  retryCount: number;
  processLog: string | null;
}

export interface OpsOverdueItem {
  id: string;
  originalFileName: string;
  waitingDays: number;
}

export interface OpsQrAlert {
  status: GroupQrStatus;
  expiry: string | null;
}

export interface OpsHealthItem {
  key: string;
  value: string;
}

export interface OpsResponse {
  stuck: OpsStuckItem[];
  overdueConfirm: OpsOverdueItem[];
  qrAlert: OpsQrAlert;
  health: OpsHealthItem[];
}
