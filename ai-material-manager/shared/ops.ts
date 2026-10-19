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

export interface OpsDepartmentAlert {
  /** mismatch：部门可读取，但维护者本人不在配置的事业部内，多半是部门 ID 填错 */
  status: "ok" | "unconfigured" | "failed" | "mismatch";
  accessCount: number;
  uploadCount: number;
}

export interface OpsHealthItem {
  key: string;
  value: string;
}

export interface OpsResponse {
  stuck: OpsStuckItem[];
  overdueConfirm: OpsOverdueItem[];
  qrAlert: OpsQrAlert;
  departmentAlert: OpsDepartmentAlert;
  health: OpsHealthItem[];
}
