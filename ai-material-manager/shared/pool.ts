/** 池记录进度阶段：①已提交 ②AI识别中 ③等你补充 ④等你确认 ⑤已入库 ⑥已发布；rejected/stuck 为分支态 */
export type PoolStage =
  | "submitted"
  | "recognizing"
  | "needInfo"
  | "needConfirm"
  | "stored"
  | "published"
  | "rejected"
  | "stuck";

export interface PoolProgress {
  stage: PoolStage;
  /** 退回原因 / 卡住日志（来自处理日志） */
  rejectReason: string | null;
}

export type PoolRecordRole = "uploader" | "designer" | "planner";

export interface PoolRecordItem {
  recordId: string;
  originalFileName: string;
  uploadTime: string | null;
  role: PoolRecordRole;
  progress: PoolProgress;
}

export interface PoolReplyRequest {
  recordId: string;
  reply: string;
}

export interface PoolActionResponse {
  success: boolean;
}

export type PoolConfirmAction = "publish" | "store" | "reject";

export interface PoolConfirmRequest {
  recordId: string;
  action: PoolConfirmAction;
  /** 退回原因，action=reject 时必填，写入处理日志 */
  reason?: string;
}

export interface PoolUploadRequest {
  originalFileName: string;
  /** 上传文件 M（导出件）的 file_token 数组 */
  uploadFileM: string[];
  sourceFileL?: string[];
  previewFileS?: string[];
  designBrief?: string;
  note?: string;
  /** 策划及审核人：飞书 Base 单人字段，使用 open_id */
  plannerAuditorId?: string;
  designerId?: string;
  isVersionReplace?: boolean;
  associateOldVersionId?: string;
  isLargeFile?: boolean;
  namingMode?: import("./naming").NamingMode;
  namingInput?: import("./naming").GuidedNamingInput;
}

export interface PoolUploadResponse {
  recordId: string;
}

export interface PoolOldVersionItem {
  baseRecordId: string;
  label: string;
}

export interface PoolOldVersionResponse {
  items: PoolOldVersionItem[];
}

export interface PoolUploadFileResponse {
  taskId: string;
  fileToken?: string;
}

export interface PoolUploadFileChunkResponse {
  uploadId?: string;
  chunkIndex?: number;
  taskId?: string;
}

export interface PoolUploadFileProgressResponse {
  taskId: string;
  fileName: string;
  totalSize: number;
  uploadedBlocks: number;
  totalBlocks: number;
  fileToken?: string;
  error?: string;
  status: "uploading" | "done" | "failed";
}
