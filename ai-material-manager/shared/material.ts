export interface MaterialListItem {
  baseRecordId: string;
  materialName: string;
  standardName: string;
  materialType: string;
  productModel: string | null;
  productLine: string | null;
  productOrBrandMaterial: string | null;
  appLanguage: string;
  applicableRegion: string[];
  currentVersion: string;
  releaseStatus: string;
  versionStatus: string;
  allowExternalSend: boolean;
  isRecommended: boolean;
  riskLabel: string[];
  previewUrl: string | null;
  coverUrl: string | null;
  isLargeFile: boolean;
}

export interface MaterialListParams {
  keyword?: string;
  materialType?: string;
  region?: string;
  productModel?: string;
  externalOnly?: boolean;
  viewGlobal?: boolean;
  offset?: number;
  limit?: number;
}

export interface MaterialListResponse {
  items: MaterialListItem[];
  total: number;
}

export interface MaterialDetail extends MaterialListItem {
  appMaterialId: string;
  appInternalMaterialId: string;
  currentValidAttachment: string[];
  sourceFileL: string[];
  cloudDiskLinkM: string | null;
  cloudDiskLinkL: string | null;
  cloudDiskLinkS: string | null;
  plannerApprover: string | null;
  designer: string | null;
  publishTime: string | null;
  subscriber: string[];
}

export interface VersionItem {
  baseRecordId: string;
  versionNumber: string;
  versionType: string;
  versionStatus: string;
  isCurrentValid: boolean;
  publishTime: string | null;
  aiComparisonSummary: string | null;
  modifyReason: string | null;
  modifier: string | null;
  receivedByMeAt: string | null;
}

export interface VersionBanner {
  mode: "oldVersion" | "currentVersion";
  newVersionMaterialId: string | null;
}

export interface MaterialDetailResponse {
  material: MaterialDetail;
  versions: VersionItem[];
  banner: VersionBanner | null;
  subscribedByMe: boolean;
  receivedByMe: boolean;
  canRetire: boolean;
}

export interface MaterialKitItem {
  baseRecordId: string;
  materialName: string;
  materialType: string;
  currentVersion: string;
}

export interface MaterialKit {
  productModel: string;
  count: number;
  typeList: string[];
  items: MaterialKitItem[];
}

export interface MaterialOtherItem {
  baseRecordId: string;
  materialName: string;
  materialType: string;
  previewUrl: string | null;
}

export interface MaterialKitsResponse {
  kits: MaterialKit[];
  otherMaterials: MaterialOtherItem[];
}

export interface ReceiveActionRequest {
  materialId: string;
}

export interface ReceiveActionResponse {
  success: boolean;
  versionId: string;
}

export interface ReceiveBatchActionRequest {
  materialIds: string[];
}

export interface ReceiveBatchActionResponse {
  created: number;
  skipped: number;
  items: Array<{ materialId: string; materialName: string; ok: boolean }>;
}

export interface SubscribeActionRequest {
  materialId: string;
  subscribe: boolean;
}

export interface SubscribeActionResponse {
  success: boolean;
}

export interface FeedbackActionRequest {
  materialId: string;
  versionId?: string;
  problemTitle: string;
  problemType: string;
  problemDescription: string;
  severityLevel: string;
}

export interface FeedbackActionResponse {
  success: boolean;
}

export interface MaterialEditFields {
  material_name?: string;
  is_recommended?: boolean;
  validity_period?: number;
  risk_label?: string[];
  app_language?: string;
  applicable_region?: string[];
}

export interface MaterialEditRequest {
  fields: MaterialEditFields;
}

export interface MaterialEditResponse {
  success: boolean;
  appliedFields: Array<keyof MaterialEditFields>;
}

export interface RetireActionRequest {
  materialId: string;
  reason: string;
}

export interface RetireActionResponse {
  success: boolean;
  subscriberCount: number;
}

export interface RestoreActionRequest {
  materialId: string;
  reason: string;
}

export interface RestoreActionResponse {
  success: boolean;
  subscriberCount: number;
}
