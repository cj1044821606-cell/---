export type BaseTableKey =
  | "main"
  | "version"
  | "pool"
  | "release"
  | "region"
  | "receive"
  | "secondary"
  | "people"
  | "aiLog"
  | "feedback"
  | "config";

export const BASE_TABLE_IDS: Record<BaseTableKey, string> = {
  main: "tbl3C5fTH08IyLkA",
  version: "tbl3S60VSKy1dGbj",
  pool: "tblcAERSb9EKbx5W",
  release: "tbl5u1ZZoCGA3UTI",
  region: "tblDbm7F8cHBUPcw",
  receive: "tblo8mHKxrY8nwIx",
  secondary: "tbl7tphraieJxyaz",
  people: "tblMXYsjBpmnVDyc",
  aiLog: "tblQi2fwq36kK6kQ",
  feedback: "tblzXAviloxcxUSw",
  config: "tblyZv7k70fD64un",
};

export type FieldKind =
  | "text"
  | "stringArray"
  | "boolean"
  | "number"
  | "date"
  | "user"
  | "users"
  | "userProfiles"
  | "link"
  | "attachment"
  | "mentionLinks";

export interface FieldContract {
  source: string;
  target: string;
  kind: FieldKind;
}

const main: FieldContract[] = [
  { source: "物料名称", target: "materialName", kind: "text" },
  { source: "关联处理池", target: "relatedProcessPool", kind: "link" },
  { source: "当前版本", target: "currentVersion", kind: "text" },
  { source: "风险标签", target: "riskLabel", kind: "stringArray" },
  { source: "有效期", target: "validityPeriod", kind: "date" },
  { source: "预览文件(S)", target: "previewFileS", kind: "attachment" },
  { source: "语言", target: "appLanguage", kind: "text" },
  { source: "发布状态", target: "releaseStatus", kind: "text" },
  { source: "发布时间", target: "publishTime", kind: "date" },
  { source: "版本记录", target: "versionRecord", kind: "link" },
  { source: "产品型号", target: "productModel", kind: "text" },
  { source: "当前有效附件", target: "currentValidAttachment", kind: "attachment" },
  { source: "创建时间", target: "createTime", kind: "date" },
  { source: "发布记录", target: "publishRecord", kind: "link" },
  { source: "封面图", target: "coverImage", kind: "attachment" },
  { source: "是否允许外发", target: "allowExternalSend", kind: "boolean" },
  { source: "产品线", target: "productLine", kind: "text" },
  { source: "源文件(L)", target: "sourceFileL", kind: "attachment" },
  { source: "策划及审核人", target: "plannerApprover", kind: "user" },
  { source: "版本状态", target: "versionStatus", kind: "text" },
  { source: "适用区域", target: "applicableRegion", kind: "stringArray" },
  { source: "物料类型", target: "materialType", kind: "text" },
  { source: "是否推荐使用", target: "isRecommended", kind: "boolean" },
  { source: "标准命名", target: "standardName", kind: "text" },
  { source: "设计师", target: "designer", kind: "user" },
  { source: "内部物料ID", target: "appInternalMaterialId", kind: "text" },
  { source: "产品系列", target: "productSeries", kind: "text" },
  { source: "产品或品牌物料", target: "productOrBrandMaterial", kind: "text" },
  { source: "区域二创记录", target: "regionalSecondaryCreationRecord", kind: "link" },
  { source: "领取记录", target: "receiptRecord", kind: "link" },
  { source: "问题反馈", target: "issueFeedback", kind: "link" },
  { source: "订阅者", target: "subscriber", kind: "users" },
  { source: "替代的旧版本", target: "replacedOldVersion", kind: "link" },
  { source: "物料ID", target: "appMaterialId", kind: "text" },
  { source: "云盘链接M", target: "cloudDiskLinkM", kind: "mentionLinks" },
  { source: "云盘链接L", target: "cloudDiskLinkL", kind: "mentionLinks" },
  { source: "云盘链接S", target: "cloudDiskLinkS", kind: "mentionLinks" },
  { source: "是否大文件", target: "isLargeFile", kind: "boolean" },
];

const version: FieldContract[] = [
  { source: "标准命名", target: "standardNaming", kind: "text" },
  { source: "内部物料ID", target: "appInternalMaterialId", kind: "text" },
  { source: "版本号", target: "versionNumber", kind: "text" },
  { source: "版本类型", target: "versionType", kind: "text" },
  { source: "版本状态", target: "versionStatus", kind: "text" },
  { source: "本版附件", target: "currentVersionAttachment", kind: "attachment" },
  { source: "源文件(L)", target: "sourceFileL", kind: "attachment" },
  { source: "预览文件(S)", target: "previewFileS", kind: "attachment" },
  { source: "AI对比摘要", target: "aiComparisonSummary", kind: "text" },
  { source: "人工确认改动点", target: "manualConfirmedChanges", kind: "text" },
  { source: "修改原因", target: "modifyReason", kind: "text" },
  { source: "修改人", target: "modifier", kind: "user" },
  { source: "审核状态", target: "auditStatus", kind: "text" },
  { source: "是否当前有效", target: "isCurrentValid", kind: "boolean" },
  { source: "发布时间", target: "publishTime", kind: "date" },
  { source: "创建时间", target: "createTime", kind: "date" },
  { source: "关联物料", target: "relatedMaterial", kind: "link" },
  { source: "对比旧版本", target: "compareOldVersion", kind: "link" },
  { source: "替代版本", target: "replacementVersion", kind: "link" },
];

const pool: FieldContract[] = [
  { source: "原始文件名", target: "originalFileName", kind: "text" },
  { source: "待处理ID", target: "appPendingId", kind: "text" },
  { source: "上传文件（M）", target: "uploadFileM", kind: "attachment" },
  { source: "设计Brief", target: "designBrief", kind: "text" },
  { source: "上传方式", target: "uploadMethod", kind: "text" },
  { source: "上传者", target: "uploader", kind: "user" },
  { source: "用户填写说明", target: "appUserFillNote", kind: "text" },
  { source: "处理锁", target: "processLock", kind: "boolean" },
  { source: "上传时间", target: "uploadTime", kind: "date" },
  { source: "关联主表", target: "relatedMainTable", kind: "link" },
  { source: "关联旧版本", target: "associateOldVersion", kind: "link" },
  { source: "源文件(L)", target: "sourceFileL", kind: "attachment" },
  { source: "预览文件（S）", target: "previewFileS", kind: "attachment" },
  { source: "处理状态", target: "processStatus", kind: "text" },
  { source: "确认结果", target: "confirmResult", kind: "text" },
  { source: "AI识别结果", target: "aiRecognizeResult", kind: "text" },
  { source: "缺失信息", target: "missingInfo", kind: "text" },
  { source: "AI追问对象", target: "aiAskTarget", kind: "user" },
  { source: "处理日志", target: "processLog", kind: "text" },
  { source: "重试次数", target: "retryCount", kind: "number" },
  { source: "策划人及审核人", target: "plannerAuditor", kind: "user" },
  { source: "设计师", target: "designer", kind: "user" },
  { source: "是否为版本替换", target: "isVersionReplace", kind: "boolean" },
  { source: "云盘链接M", target: "cloudLinkM", kind: "mentionLinks" },
  { source: "云盘链接L", target: "cloudLinkL", kind: "mentionLinks" },
  { source: "云盘链接S", target: "cloudLinkS", kind: "mentionLinks" },
  { source: "是否大文件", target: "isLargeFile", kind: "boolean" },
  { source: "是否已发送：“确认”", target: "isSentConfirm", kind: "boolean" },
  { source: "确认后自动发布", target: "autoPublishAfterConfirm", kind: "boolean" },
  { source: "用户补充回复", target: "userSupplementReply", kind: "text" },
];

const release: FieldContract[] = [
  { source: "发布标题", target: "publishTitle", kind: "text" },
  { source: "发布ID", target: "appPublishId", kind: "text" },
  { source: "发布人", target: "publisher", kind: "user" },
  { source: "发布区域", target: "publishArea", kind: "stringArray" },
  { source: "发布对象", target: "publishTarget", kind: "stringArray" },
  { source: "发布说明", target: "publishNote", kind: "text" },
  { source: "是否通知旧版废弃", target: "notifyOldDeprecation", kind: "boolean" },
  { source: "旧版本处理方式", target: "oldVersionHandling", kind: "text" },
  { source: "通知状态", target: "notifyStatus", kind: "text" },
  { source: "发布时间", target: "publishTime", kind: "date" },
  { source: "创建时间", target: "createTime", kind: "date" },
  { source: "关联物料", target: "relatedMaterial", kind: "link" },
  { source: "发布版本", target: "releaseVersion", kind: "link" },
];

const region: FieldContract[] = [
  { source: "区域", target: "region", kind: "text" },
  { source: "区域编码", target: "regionCode", kind: "text" },
  { source: "默认语言", target: "defaultLanguage", kind: "stringArray" },
  { source: "区域成员", target: "regionMember", kind: "users" },
  { source: "区域负责人", target: "regionPrincipal", kind: "user" },
  { source: "可见物料类型", target: "visibleMaterialType", kind: "stringArray" },
  { source: "是否允许二创", target: "allowSecondaryCreation", kind: "boolean" },
  { source: "二创是否需总部审核", target: "secondaryCreationHeadquartersAudit", kind: "boolean" },
  { source: "是否允许客户外发", target: "allowClientDistribution", kind: "text" },
  { source: "禁用产品", target: "disabledProduct", kind: "text" },
];

const receive: FieldContract[] = [
  { source: "领取记录", target: "receiveRecord", kind: "text" },
  { source: "记录ID（领用）", target: "appRecordIdReceive", kind: "text" },
  { source: "领取下载人", target: "receiveDownloadPerson", kind: "user" },
  { source: "所属部门", target: "department", kind: "stringArray" },
  { source: "所属区域", target: "region", kind: "text" },
  { source: "是否已被新版替代", target: "isReplacedNewVersion", kind: "boolean" },
  { source: "是否已通知", target: "isNotified", kind: "boolean" },
  { source: "下载时间", target: "downloadTime", kind: "date" },
  { source: "物料", target: "material", kind: "link" },
  { source: "版本", target: "version", kind: "link" },
];

const secondary: FieldContract[] = [
  { source: "区域版本ID", target: "appRegionVersionId", kind: "text" },
  { source: "区域版本号", target: "regionVersionNo", kind: "text" },
  { source: "区域", target: "region", kind: "text" },
  { source: "语言", target: "language", kind: "text" },
  { source: "修改目的", target: "modifyPurpose", kind: "text" },
  { source: "区域导出文件(M)", target: "regionExportFileM", kind: "attachment" },
  { source: "区域源文件(L)", target: "regionSourceFileL", kind: "attachment" },
  { source: "AI对比摘要", target: "aiCompareSummary", kind: "text" },
  { source: "区域修改说明", target: "regionModifyNote", kind: "text" },
  { source: "审核状态", target: "auditStatus", kind: "text" },
  { source: "是否允许外发", target: "allowOutbound", kind: "boolean" },
  { source: "是否当前区域有效版本", target: "currentRegionValidVersion", kind: "boolean" },
  { source: "修改人", target: "appModifier", kind: "user" },
  { source: "创建时间", target: "createTime", kind: "date" },
  { source: "关联总部物料", target: "relatedHeadquartersMaterial", kind: "link" },
  { source: "基于总部版本", target: "basedHeadquartersVersion", kind: "link" },
];

const people: FieldContract[] = [
  { source: "文本", target: "text", kind: "text" },
  { source: "人员", target: "appPerson", kind: "users" },
  { source: "人员", target: "appPersonProfiles", kind: "userProfiles" },
  { source: "区域标识", target: "areaIdentifier", kind: "text" },
];

const feedback: FieldContract[] = [
  { source: "问题标题", target: "problemTitle", kind: "text" },
  { source: "问题ID", target: "appProblemId", kind: "text" },
  { source: "反馈人", target: "reporter", kind: "user" },
  { source: "问题类型", target: "problemType", kind: "text" },
  { source: "问题描述", target: "problemDescription", kind: "text" },
  { source: "严重程度", target: "severityLevel", kind: "text" },
  { source: "处理负责人", target: "handler", kind: "user" },
  { source: "处理状态", target: "processingStatus", kind: "text" },
  { source: "是否需要下架", target: "needRemove", kind: "boolean" },
  { source: "创建时间", target: "createTime", kind: "date" },
  { source: "关联物料", target: "relatedMaterial", kind: "link" },
  { source: "修复版本", target: "fixVersion", kind: "link" },
  { source: "关联版本", target: "relatedVersion", kind: "link" },
];

const config: FieldContract[] = [
  { source: "配置键", target: "key", kind: "text" },
  { source: "配置名称", target: "name", kind: "text" },
  { source: "文本值", target: "textValue", kind: "text" },
  { source: "图片", target: "imageUrls", kind: "attachment" },
  { source: "有效期", target: "expiryMs", kind: "number" },
  { source: "是否启用", target: "enabled", kind: "boolean" },
];

export const BASE_FIELD_CONTRACTS: Record<BaseTableKey, FieldContract[]> = {
  main,
  version,
  pool,
  release,
  region,
  receive,
  secondary,
  people,
  aiLog: [],
  feedback,
  config,
};
