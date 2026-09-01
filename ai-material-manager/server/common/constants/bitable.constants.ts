export function getBitableAppToken(): string {
  return process.env.FEISHU_BASE_APP_TOKEN ?? "";
}

export const BITABLE_TABLES = {
  materialAssetMain: "tbl3C5fTH08IyLkA",
  downloadReceiveRecord: "tblo8mHKxrY8nwIx",
  problemFeedback: "tblzXAviloxcxUSw",
  systemConfig: "tblyZv7k70fD64un",
  versionRecord: "tbl3S60VSKy1dGbj",
  aiPendingPool: "tblcAERSb9EKbx5W",
  regionSecondaryCreationRecord: "tbl7tphraieJxyaz",
  releaseRecord: "tbl5u1ZZoCGA3UTI",
  regionConfig: "tblDbm7F8cHBUPcw",
  personnelDefinition: "tblMXYsjBpmnVDyc",
  aiProcessLog: "tblQi2fwq36kK6kQ",
} as const;

/** 写入目标表的语义标识（服务端由 FeishuBaseGateway 执行） */
export const BITABLE_PLUGIN_IDS = {
  receiveRecord: "feishu_bitable_claim_download_record_operation_4",
  problemFeedback: "feishu_bitable_issue_feedback_table_operation_1",
  materialMain: "feishu_bitable_material_asset_master_table_operation_4",
  aiPendingPool: "feishu_bitable_ai_pending_pool_operation_3",
  systemConfig: "feishu_bitable_system_config_table_read_1",
} as const;

export const MATERIAL_EDIT_WHITELIST = [
  "material_name",
  "is_recommended",
  "validity_period",
  "risk_label",
  "app_language",
  "applicable_region",
] as const;

export type MaterialEditFieldKey = (typeof MATERIAL_EDIT_WHITELIST)[number];

export const MATERIAL_EDIT_FIELD_TO_BITABLE: Record<
  MaterialEditFieldKey,
  string
> = {
  material_name: "物料名称",
  is_recommended: "是否推荐使用",
  validity_period: "有效期",
  risk_label: "风险标签",
  app_language: "语言",
  applicable_region: "适用区域",
};

export const RECEIVE_REGION_DEFAULT = "GLOBAL 全球";

export const SYSTEM_CONFIG_KEYS = {
  groupQr: "group_qr",
  uploadFormUrl: "upload_form_url",
  syncDelayHint: "sync_delay_hint",
} as const;

export const RELEASE_STATUS = {
  published: "已发布",
  waitPublish: "待发布",
  offline: "已下架",
} as const;

export const VERSION_STATUS = {
  official: "正式版",
  replaced: "已替代",
  deprecated: "已废弃",
} as const;

export const INBOX_LIMIT = 100;
