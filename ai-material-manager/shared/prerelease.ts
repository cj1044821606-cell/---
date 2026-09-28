/**
 * AI 助手快速通道（预发布）：选项与多维表格当前真实选项一致，
 * 写入前仍以飞书 field-list 为准；新增选项需先在多维表格里加好再同步到这里。
 */

export const PRODUCT_LINE_OPTIONS = [
  "AIO 一体机",
  "INV 逆变器",
  "BAT 电池",
  "PPS 便携储能",
  "ESS 储能系统",
  "BR 品牌",
  "C&I 工商储",
  "储能",
] as const;

/** 主表「适用区域」多选（行级可见性依据），与命名里的市场码是两回事 */
export const APPLICABLE_REGION_OPTIONS = [
  "AF 非洲",
  "SEA 东南亚",
  "ME 中东",
  "LATAM 拉美",
  "GLOBAL 全球",
] as const;

export const RISK_TAG_OPTIONS = [
  "参数风险",
  "区域不适用",
  "外发风险",
  "旧版风险",
  "重复物料",
  "品牌物料",
] as const;

/** 版本替换时可选的版本类型（首次上传固定为「首版」） */
export const UPDATE_VERSION_TYPE_OPTIONS = ["小改", "大改", "错误修复"] as const;

export const MODIFY_REASON_OPTIONS = [
  "首次发布",
  "参数修正",
  "文案优化",
  "视觉优化",
  "区域适配",
] as const;

export type ProductLine = (typeof PRODUCT_LINE_OPTIONS)[number];
export type ApplicableRegion = (typeof APPLICABLE_REGION_OPTIONS)[number];
export type RiskTag = (typeof RISK_TAG_OPTIONS)[number];
export type UpdateVersionType = (typeof UPDATE_VERSION_TYPE_OPTIONS)[number];
export type ModifyReason = (typeof MODIFY_REASON_OPTIONS)[number];

export interface PrereleaseReviewRequest {
  /** 驳回时必填 */
  reason?: string;
}

export interface PrereleaseReviewResponse {
  success: true;
  materialId: string;
  result: "approved" | "rejected";
}
