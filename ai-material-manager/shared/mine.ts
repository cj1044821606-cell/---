export interface MyReceivedItem {
  id: string;
  downloadTime: string;
  materialName: string | null;
  versionNo: string | null;
  isReplacedNewVersion: boolean;
  materialBaseRecordId: string | null;
}

export interface MyReceivedResponse {
  items: MyReceivedItem[];
}

export interface MySubscribedItem {
  baseRecordId: string;
  materialName: string;
  standardName: string;
  previewUrl: string | null;
  thumbUrl: string | null;
  currentVersion: string;
}

export interface MySubscribedResponse {
  items: MySubscribedItem[];
}

export type MyHandledStage = "waitPublish" | "published" | "offline";
export type MyHandledRole = "planner" | "designer";

export interface MyHandledItem {
  baseRecordId: string;
  materialName: string;
  stage: MyHandledStage;
  role: MyHandledRole;
}

export interface MyHandledResponse {
  items: MyHandledItem[];
  /** 我经手的池记录（带进度条）：上传/设计/策划审核与我相关 */
  poolRecords: import("./pool").PoolRecordItem[];
}
