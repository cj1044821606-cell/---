import { BITABLE_TABLES } from "@server/common/constants/bitable.constants";

/** AI 待处理池处理状态（多维表格同步值） */
export const AI_PROCESS_STATUS = {
  pendingRecognize: "待识别",
  needSupplement: "待补充",
  needConfirm: "待确认",
  returned: "已退回",
  failed: "失败",
} as const;

export const CONFIRM_RESULT_WAITING = "待确认";

export const REGION_AUDIT_STATUS_WAITING = "待审核";

export const PROBLEM_STATUS_WAITING = "待处理";

/** 失败且重试次数达到该阈值视为「卡住」 */
export const STUCK_RETRY_THRESHOLD = 3;

/** 待办来源表中文名 */
export const INBOX_SOURCE_TABLE_NAMES = {
  aiPendingPool: "AI待处理池",
  materialAssetMain: "物料资产主表",
  regionSecondaryCreationRecord: "区域二创记录",
  downloadReceiveRecord: "下载领取记录",
  problemFeedback: "问题反馈",
} as const;

export type InboxSourceTable = keyof typeof INBOX_SOURCE_TABLE_NAMES;

/** 深链对应的多维表格 table ID */
export const INBOX_DEEP_LINK_TABLES: Record<InboxSourceTable, string> = {
  aiPendingPool: BITABLE_TABLES.aiPendingPool,
  materialAssetMain: BITABLE_TABLES.materialAssetMain,
  regionSecondaryCreationRecord:
    BITABLE_TABLES.regionSecondaryCreationRecord,
  downloadReceiveRecord: BITABLE_TABLES.downloadReceiveRecord,
  problemFeedback: BITABLE_TABLES.problemFeedback,
};
