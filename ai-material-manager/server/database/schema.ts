/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { bigint, boolean, date, foreignKey, index, jsonb, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const problemFeedback = pgTable("problem_feedback", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  problemTitle: text("problem_title"),
  // Synced field: auto-synced, do not modify or delete
  appProblemId: text("app_problem_id"),
  // Synced field: auto-synced, do not modify or delete
  reporter: userProfile("reporter"),
  // Synced field: auto-synced, do not modify or delete
  problemType: text("problem_type"),
  // Synced field: auto-synced, do not modify or delete
  problemDescription: text("problem_description"),
  // Synced field: auto-synced, do not modify or delete
  severityLevel: text("severity_level"),
  // Synced field: auto-synced, do not modify or delete
  handler: userProfile("handler"),
  // Synced field: auto-synced, do not modify or delete
  processingStatus: text("processing_status"),
  // Synced field: auto-synced, do not modify or delete
  needRemove: boolean("need_remove"),
  // Synced field: auto-synced, do not modify or delete
  createTime: customTimestamptz("create_time", { precision: 6 }),
  /**
   * 关联物料
   */
  // Synced field: auto-synced, do not modify or delete
  relatedMaterial: jsonb("related_material"),
  /**
   * 修复版本
   */
  // Synced field: auto-synced, do not modify or delete
  fixVersion: jsonb("fix_version"),
  /**
   * 关联版本
   */
  // Synced field: auto-synced, do not modify or delete
  relatedVersion: jsonb("related_version"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435867992244").on(table.id),
  uniqueIndex("unq_1873435867993300").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const aiProcessLog = pgTable("ai_process_log", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  logTitle: text("log_title"),
  // Synced field: auto-synced, do not modify or delete
  appLogId: text("app_log_id"),
  // Synced field: auto-synced, do not modify or delete
  objectType: text("object_type"),
  // Synced field: auto-synced, do not modify or delete
  aiActionType: text("ai_action_type"),
  // Synced field: auto-synced, do not modify or delete
  inputInfoSummary: text("input_info_summary"),
  // Synced field: auto-synced, do not modify or delete
  callKnowledgeBase: text("call_knowledge_base").array(),
  // Synced field: auto-synced, do not modify or delete
  aiJudgeResult: text("ai_judge_result"),
  // Synced field: auto-synced, do not modify or delete
  manualConfirmResult: text("manual_confirm_result"),
  // Synced field: auto-synced, do not modify or delete
  executionStatus: text("execution_status"),
  // Synced field: auto-synced, do not modify or delete
  timeConsumeSeconds: bigint("time_consume_seconds", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  executionTime: customTimestamptz("execution_time", { precision: 6 }),
  /**
   * 关联物料
   */
  // Synced field: auto-synced, do not modify or delete
  relatedMaterial: jsonb("related_material"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435811063847").on(table.id),
  uniqueIndex("unq_1873435811064839").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const personnelDefinition = pgTable("personnel_definition", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  text: text("text"),
  // Synced field: auto-synced, do not modify or delete
  appPerson: userProfileArray("app_person"),
  // Synced field: auto-synced, do not modify or delete
  areaIdentifier: text("area_identifier"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435811059751").on(table.id),
  uniqueIndex("unq_1873435811061767").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const regionSecondaryCreationRecord = pgTable("region_secondary_creation_record", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  appRegionVersionId: text("app_region_version_id"),
  // Synced field: auto-synced, do not modify or delete
  regionVersionNo: text("region_version_no"),
  // Synced field: auto-synced, do not modify or delete
  region: text("region"),
  // Synced field: auto-synced, do not modify or delete
  language: text("language"),
  // Synced field: auto-synced, do not modify or delete
  modifyPurpose: text("modify_purpose"),
  // Synced field: auto-synced, do not modify or delete
  regionExportFileM: text("region_export_file_m").array(),
  // Synced field: auto-synced, do not modify or delete
  regionSourceFileL: text("region_source_file_l").array(),
  // Synced field: auto-synced, do not modify or delete
  aiCompareSummary: text("ai_compare_summary"),
  // Synced field: auto-synced, do not modify or delete
  regionModifyNote: text("region_modify_note"),
  // Synced field: auto-synced, do not modify or delete
  auditStatus: text("audit_status"),
  // Synced field: auto-synced, do not modify or delete
  allowOutbound: boolean("allow_outbound"),
  // Synced field: auto-synced, do not modify or delete
  currentRegionValidVersion: boolean("current_region_valid_version"),
  // Synced field: auto-synced, do not modify or delete
  appModifier: userProfile("app_modifier"),
  // Synced field: auto-synced, do not modify or delete
  createTime: customTimestamptz("create_time", { precision: 6 }),
  /**
   * 关联总部物料
   */
  // Synced field: auto-synced, do not modify or delete
  relatedHeadquartersMaterial: jsonb("related_headquarters_material"),
  /**
   * 基于总部版本
   */
  // Synced field: auto-synced, do not modify or delete
  basedHeadquartersVersion: jsonb("based_headquarters_version"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435811051543").on(table.id),
  uniqueIndex("unq_1873435811051575").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const downloadReceiveRecord = pgTable("download_receive_record", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  receiveRecord: text("receive_record"),
  // Synced field: auto-synced, do not modify or delete
  appRecordIdReceive: text("app_record_id_receive"),
  // Synced field: auto-synced, do not modify or delete
  receiveDownloadPerson: userProfile("receive_download_person"),
  // Synced field: auto-synced, do not modify or delete
  department: text("department").array(),
  // Synced field: auto-synced, do not modify or delete
  region: text("region"),
  // Synced field: auto-synced, do not modify or delete
  isReplacedNewVersion: boolean("is_replaced_new_version"),
  // Synced field: auto-synced, do not modify or delete
  isNotified: boolean("is_notified"),
  // Synced field: auto-synced, do not modify or delete
  inAppReadAt: customTimestamptz("in_app_read_at", { precision: 6 }),
  // Synced field: auto-synced, do not modify or delete
  downloadTime: customTimestamptz("download_time", { precision: 6 }),
  /**
   * 物料
   */
  // Synced field: auto-synced, do not modify or delete
  material: jsonb("material"),
  /**
   * 版本
   */
  // Synced field: auto-synced, do not modify or delete
  version: jsonb("version"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435811044455").on(table.id),
  uniqueIndex("unq_1873435811046407").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const regionConfig = pgTable("region_config", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  region: text("region"),
  // Synced field: auto-synced, do not modify or delete
  regionCode: text("region_code"),
  // Synced field: auto-synced, do not modify or delete
  defaultLanguage: text("default_language").array(),
  // Synced field: auto-synced, do not modify or delete
  regionMember: userProfileArray("region_member"),
  // Synced field: auto-synced, do not modify or delete
  regionPrincipal: userProfile("region_principal"),
  // Synced field: auto-synced, do not modify or delete
  visibleMaterialType: text("visible_material_type").array(),
  // Synced field: auto-synced, do not modify or delete
  allowSecondaryCreation: boolean("allow_secondary_creation"),
  // Synced field: auto-synced, do not modify or delete
  secondaryCreationHeadquartersAudit: boolean("secondary_creation_headquarters_audit"),
  // Synced field: auto-synced, do not modify or delete
  allowClientDistribution: text("allow_client_distribution"),
  // Synced field: auto-synced, do not modify or delete
  disabledProduct: text("disabled_product"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435811036279").on(table.id),
  uniqueIndex("unq_1873435811037271").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const releaseRecord = pgTable("release_record", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  publishTitle: text("publish_title"),
  // Synced field: auto-synced, do not modify or delete
  appPublishId: text("app_publish_id"),
  // Synced field: auto-synced, do not modify or delete
  publisher: userProfile("publisher"),
  // Synced field: auto-synced, do not modify or delete
  publishArea: text("publish_area").array(),
  // Synced field: auto-synced, do not modify or delete
  publishTarget: text("publish_target").array(),
  // Synced field: auto-synced, do not modify or delete
  publishNote: text("publish_note"),
  // Synced field: auto-synced, do not modify or delete
  notifyOldDeprecation: boolean("notify_old_deprecation"),
  // Synced field: auto-synced, do not modify or delete
  oldVersionHandling: text("old_version_handling"),
  // Synced field: auto-synced, do not modify or delete
  notifyStatus: text("notify_status"),
  // Synced field: auto-synced, do not modify or delete
  publishTime: customTimestamptz("publish_time", { precision: 6 }),
  // Synced field: auto-synced, do not modify or delete
  createTime: customTimestamptz("create_time", { precision: 6 }),
  /**
   * 关联物料
   */
  // Synced field: auto-synced, do not modify or delete
  relatedMaterial: jsonb("related_material"),
  /**
   * 发布版本
   */
  // Synced field: auto-synced, do not modify or delete
  releaseVersion: jsonb("release_version"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435753487443").on(table.id),
  uniqueIndex("unq_1873435753487475").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const aiPendingPool = pgTable("ai_pending_pool", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  originalFileName: text("original_file_name"),
  // Synced field: auto-synced, do not modify or delete
  appPendingId: text("app_pending_id"),
  // Synced field: auto-synced, do not modify or delete
  uploadFileM: text("upload_file_m").array(),
  // Synced field: auto-synced, do not modify or delete
  designBrief: text("design_brief"),
  // Synced field: auto-synced, do not modify or delete
  uploadMethod: text("upload_method"),
  // Synced field: auto-synced, do not modify or delete
  uploader: userProfile("uploader"),
  // Synced field: auto-synced, do not modify or delete
  appUserFillNote: text("app_user_fill_note"),
  // Synced field: auto-synced, do not modify or delete
  processLock: boolean("process_lock"),
  // Synced field: auto-synced, do not modify or delete
  uploadTime: customTimestamptz("upload_time", { precision: 6 }),
  /**
   * 关联主表
   */
  // Synced field: auto-synced, do not modify or delete
  relatedMainTable: jsonb("related_main_table"),
  // Synced field: auto-synced, do not modify or delete
  associateOldVersion: text("associate_old_version"),
  // Synced field: auto-synced, do not modify or delete
  sourceFileL: text("source_file_l").array(),
  // Synced field: auto-synced, do not modify or delete
  previewFileS: text("preview_file_s").array(),
  // Synced field: auto-synced, do not modify or delete
  processStatus: text("process_status"),
  // Synced field: auto-synced, do not modify or delete
  confirmResult: text("confirm_result"),
  // Synced field: auto-synced, do not modify or delete
  aiRecognizeResult: text("ai_recognize_result"),
  // Synced field: auto-synced, do not modify or delete
  missingInfo: text("missing_info"),
  // Synced field: auto-synced, do not modify or delete
  aiAskTarget: userProfile("ai_ask_target"),
  // Synced field: auto-synced, do not modify or delete
  processLog: text("process_log"),
  // Synced field: auto-synced, do not modify or delete
  retryCount: bigint("retry_count", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  plannerAuditor: userProfile("planner_auditor"),
  // Synced field: auto-synced, do not modify or delete
  designer: userProfile("designer"),
  // Synced field: auto-synced, do not modify or delete
  isVersionReplace: boolean("is_version_replace"),
  // Synced field: auto-synced, do not modify or delete
  cloudLinkM: text("cloud_link_m"),
  // Synced field: auto-synced, do not modify or delete
  cloudLinkL: text("cloud_link_l"),
  // Synced field: auto-synced, do not modify or delete
  cloudLinkS: text("cloud_link_s"),
  // Synced field: auto-synced, do not modify or delete
  isLargeFile: boolean("is_large_file"),
  // Synced field: auto-synced, do not modify or delete
  isSentConfirm: boolean("is_sent_confirm"),
  // Synced field: auto-synced, do not modify or delete
  autoPublishAfterConfirm: boolean("auto_publish_after_confirm"),
  // Synced field: auto-synced, do not modify or delete
  namingMode: text("naming_mode"),
  // Synced field: auto-synced, do not modify or delete
  guidedCategory: text("guided_category"),
  // Synced field: auto-synced, do not modify or delete
  guidedProductModel: text("guided_product_model"),
  // Synced field: auto-synced, do not modify or delete
  guidedMaterialType: text("guided_material_type"),
  // Synced field: auto-synced, do not modify or delete
  guidedLanguage: text("guided_language"),
  // Synced field: auto-synced, do not modify or delete
  guidedRegion: text("guided_region"),
  // Synced field: auto-synced, do not modify or delete
  guidedVersion: text("guided_version"),
  // Synced field: auto-synced, do not modify or delete
  guidedName: text("guided_name"),
  // Synced field: auto-synced, do not modify or delete
  guidedEventYear: bigint("guided_event_year", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  guidedPreview: text("guided_preview"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435753474211").on(table.id),
  uniqueIndex("unq_1873435753475075").on(table.baseRecordId),
  foreignKey({
    columns: [table.associateOldVersion],
    foreignColumns: [versionRecord.baseRecordId],
    name: "fk_relation_1873435753486499",
  }).onDelete("set null").onUpdate("cascade"),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const versionRecord = pgTable("version_record", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  standardNaming: text("standard_naming"),
  // Synced field: auto-synced, do not modify or delete
  appInternalMaterialId: text("app_internal_material_id"),
  // Synced field: auto-synced, do not modify or delete
  versionNumber: text("version_number"),
  // Synced field: auto-synced, do not modify or delete
  versionType: text("version_type"),
  // Synced field: auto-synced, do not modify or delete
  versionStatus: text("version_status"),
  // Synced field: auto-synced, do not modify or delete
  currentVersionAttachment: text("current_version_attachment").array(),
  // Synced field: auto-synced, do not modify or delete
  sourceFileL: text("source_file_l").array(),
  // Synced field: auto-synced, do not modify or delete
  previewFileS: text("preview_file_s").array(),
  // Synced field: auto-synced, do not modify or delete
  aiComparisonSummary: text("ai_comparison_summary"),
  // Synced field: auto-synced, do not modify or delete
  manualConfirmedChanges: text("manual_confirmed_changes"),
  // Synced field: auto-synced, do not modify or delete
  modifyReason: text("modify_reason"),
  // Synced field: auto-synced, do not modify or delete
  modifier: userProfile("modifier"),
  // Synced field: auto-synced, do not modify or delete
  auditStatus: text("audit_status"),
  // Synced field: auto-synced, do not modify or delete
  isCurrentValid: boolean("is_current_valid"),
  // Synced field: auto-synced, do not modify or delete
  publishTime: date("publish_time"),
  // Synced field: auto-synced, do not modify or delete
  createTime: customTimestamptz("create_time", { precision: 6 }),
  /**
   * 关联物料
   */
  // Synced field: auto-synced, do not modify or delete
  relatedMaterial: jsonb("related_material"),
  /**
   * 对比旧版本
   */
  // Synced field: auto-synced, do not modify or delete
  compareOldVersion: jsonb("compare_old_version"),
  /**
   * 替代版本
   */
  // Synced field: auto-synced, do not modify or delete
  replacementVersion: jsonb("replacement_version"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435753464995").on(table.id),
  uniqueIndex("unq_1873435753465859").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const materialAssetMain = pgTable("material_asset_main", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  materialName: text("material_name"),
  /**
   * 关联处理池
   */
  // Synced field: auto-synced, do not modify or delete
  relatedProcessPool: jsonb("related_process_pool"),
  // Synced field: auto-synced, do not modify or delete
  currentVersion: text("current_version"),
  // Synced field: auto-synced, do not modify or delete
  riskLabel: text("risk_label").array(),
  // Synced field: auto-synced, do not modify or delete
  validityPeriod: date("validity_period"),
  // Synced field: auto-synced, do not modify or delete
  previewFileS: text("preview_file_s").array(),
  // Synced field: auto-synced, do not modify or delete
  appLanguage: text("app_language"),
  // Synced field: auto-synced, do not modify or delete
  releaseStatus: text("release_status"),
  // Synced field: auto-synced, do not modify or delete
  publishTime: date("publish_time"),
  /**
   * 版本记录
   */
  // Synced field: auto-synced, do not modify or delete
  versionRecord: jsonb("version_record"),
  // Synced field: auto-synced, do not modify or delete
  productModel: text("product_model"),
  // Synced field: auto-synced, do not modify or delete
  currentValidAttachment: text("current_valid_attachment").array(),
  // Synced field: auto-synced, do not modify or delete
  createTime: customTimestamptz("create_time", { precision: 6 }),
  /**
   * 发布记录
   */
  // Synced field: auto-synced, do not modify or delete
  publishRecord: jsonb("publish_record"),
  // Synced field: auto-synced, do not modify or delete
  coverImage: text("cover_image").array(),
  // Synced field: auto-synced, do not modify or delete
  allowExternalSend: boolean("allow_external_send"),
  // Synced field: auto-synced, do not modify or delete
  productLine: text("product_line"),
  // Synced field: auto-synced, do not modify or delete
  sourceFileL: text("source_file_l").array(),
  // Synced field: auto-synced, do not modify or delete
  plannerApprover: userProfile("planner_approver"),
  // Synced field: auto-synced, do not modify or delete
  versionStatus: text("version_status"),
  // Synced field: auto-synced, do not modify or delete
  applicableRegion: text("applicable_region").array(),
  // Synced field: auto-synced, do not modify or delete
  materialType: text("material_type"),
  // Synced field: auto-synced, do not modify or delete
  isRecommended: boolean("is_recommended"),
  // Synced field: auto-synced, do not modify or delete
  standardName: text("standard_name"),
  // Synced field: auto-synced, do not modify or delete
  designer: userProfile("designer"),
  // Synced field: auto-synced, do not modify or delete
  appInternalMaterialId: text("app_internal_material_id"),
  // Synced field: auto-synced, do not modify or delete
  productSeries: text("product_series"),
  // Synced field: auto-synced, do not modify or delete
  productOrBrandMaterial: text("product_or_brand_material"),
  /**
   * 区域二创记录
   */
  // Synced field: auto-synced, do not modify or delete
  regionalSecondaryCreationRecord: jsonb("regional_secondary_creation_record"),
  /**
   * 领取记录
   */
  // Synced field: auto-synced, do not modify or delete
  receiptRecord: jsonb("receipt_record"),
  /**
   * 问题反馈
   */
  // Synced field: auto-synced, do not modify or delete
  issueFeedback: jsonb("issue_feedback"),
  // Synced field: auto-synced, do not modify or delete
  subscriber: userProfileArray("subscriber"),
  /**
   * 替代的旧版本
   */
  // Synced field: auto-synced, do not modify or delete
  replacedOldVersion: jsonb("replaced_old_version"),
  // Synced field: auto-synced, do not modify or delete
  appMaterialId: text("app_material_id"),
  // Synced field: auto-synced, do not modify or delete
  cloudDiskLinkM: text("cloud_disk_link_m"),
  // Synced field: auto-synced, do not modify or delete
  cloudDiskLinkL: text("cloud_disk_link_l"),
  // Synced field: auto-synced, do not modify or delete
  cloudDiskLinkS: text("cloud_disk_link_s"),
  // Synced field: auto-synced, do not modify or delete
  isLargeFile: boolean("is_large_file"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1873435691660344").on(table.id),
  uniqueIndex("unq_1873435691661336").on(table.baseRecordId),
]);

// table aliases
export const aiPendingPoolTable = aiPendingPool;
export const aiProcessLogTable = aiProcessLog;
export const downloadReceiveRecordTable = downloadReceiveRecord;
export const materialAssetMainTable = materialAssetMain;
export const personnelDefinitionTable = personnelDefinition;
export const problemFeedbackTable = problemFeedback;
export const regionConfigTable = regionConfig;
export const regionSecondaryCreationRecordTable = regionSecondaryCreationRecord;
export const releaseRecordTable = releaseRecord;
export const versionRecordTable = versionRecord;
