export interface ReceiveRequest {
  materialId: string;
}

export interface ReceiveResponse {
  success: boolean;
  versionId: string;
}

export interface ReceiveBatchRequest {
  materialIds: string[];
}

export interface ReceiveBatchResponse {
  created: number;
  skipped: number;
}

export interface SubscribeRequest {
  materialId: string;
  subscribe: boolean;
}

export interface SubscribeResponse {
  success: boolean;
}

export interface FeedbackRequest {
  materialId: string;
  versionId?: string;
  problemTitle: string;
  problemType: string;
  problemDescription: string;
  severityLevel: string;
}

export interface FeedbackResponse {
  success: boolean;
}
