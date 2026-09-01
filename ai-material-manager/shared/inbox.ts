export type InboxCardType =
  | "recognizing"
  | "aiAsk"
  | "confirmRecognize"
  | "returned"
  | "waitPublish"
  | "regionAudit"
  | "versionReplaced"
  | "problemHandle"
  | "stuck";

import type { PoolProgress } from "./pool";

export interface InboxCardField {
  labelKey: string;
  value: string;
}

export interface InboxCard {
  id: string;
  type: InboxCardType;
  titleKey: string;
  sourceTable: string;
  waitingDays: number;
  body: string;
  fields: InboxCardField[];
  deepLink: string;
  recordId: string;
  /** 池记录进度条（B-5），仅 ai_pending_pool 来源卡片有值 */
  progress?: PoolProgress;
}

export interface InboxResponse {
  items: InboxCard[];
}
