export interface InboxI18nEntry {
  zh: string;
  en: string;
}

/**
 * 待办箱模块字典。服务端返回的 titleKey / labelKey 先在此解析，
 * 缺 key 时回退中央字典（useI18n 的 t），仍缺则展示 value 本身。
 */
export const INBOX_I18N: Record<string, InboxI18nEntry> = {
  // 页面
  "inbox.page.subtitle": {
    zh: "等你的事都在这里，按等待时间排序",
    en: "Everything waiting for you, sorted by waiting time",
  },
  "inbox.group.priority": {
    zh: "等太久了 · 优先处理",
    en: "Waiting too long · Handle first",
  },
  "inbox.group.normal": {
    zh: "待处理",
    en: "To do",
  },
  "inbox.empty.title": {
    zh: "今天没有需要你处理的事",
    en: "Nothing needs your attention today",
  },
  "inbox.empty.description": {
    zh: "有新的待办时会自动出现在这里",
    en: "New items will show up here automatically",
  },
  "inbox.error.load": {
    zh: "待办加载失败，请重试",
    en: "Failed to load your inbox. Please retry",
  },
  "inbox.action.refresh": { zh: "刷新待办", en: "Refresh inbox" },
  "inbox.action.refreshing": { zh: "正在刷新待办", en: "Refreshing inbox" },
  "inbox.action.acknowledge": { zh: "知道了", en: "Got it" },
  "inbox.action.acknowledgeDone": {
    zh: "已标记为站内已读",
    en: "Marked as read in the app",
  },
  "inbox.badge.daysNoProgress": {
    zh: "天无进展",
    en: "days, no progress",
  },
  "inbox.quote.label": {
    zh: "AI 原话",
    en: "AI says",
  },

  // 9 类卡片标题
  "inbox.recognizing.title": {
    zh: "AI 正在识别物料信息",
    en: "AI is recognizing your material",
  },
  "inbox.aiAsk.title": {
    zh: "AI 需要你补充信息",
    en: "AI needs more info from you",
  },
  "inbox.confirmRecognize.title": {
    zh: "确认 AI 识别结果",
    en: "Confirm AI recognition result",
  },
  "inbox.returned.title": {
    zh: "物料被退回，需要你修改",
    en: "Material returned for your revision",
  },
  "inbox.waitPublish.title": {
    zh: "物料等你发布",
    en: "Material waiting for you to publish",
  },
  "inbox.regionAudit.title": {
    zh: "区域二创等你审核",
    en: "Region re-creation awaiting your review",
  },
  "inbox.versionReplaced.title": {
    zh: "你领的版本已有新版",
    en: "Your downloaded version was replaced",
  },
  "inbox.problemHandle.title": {
    zh: "问题反馈等你处理",
    en: "Issue feedback waiting for you",
  },
  "inbox.prereleaseReview.title": {
    zh: "预发布物料等你审核",
    en: "Pre-release waiting for your review",
  },
  "inbox.prereleaseRejected.title": {
    zh: "你预发布的物料被驳回",
    en: "Your pre-release was rejected",
  },
  "inbox.stuck.title": {
    zh: "AI 处理卡住了，需要人工介入",
    en: "AI processing stuck, needs manual care",
  },

  // 9 类卡片 CTA
  "inbox.recognizing.cta": { zh: "去飞书关注", en: "Follow in Feishu" },
  "inbox.aiAsk.cta": { zh: "去飞书补充", en: "Provide info in Feishu" },
  "inbox.confirmRecognize.cta": { zh: "去飞书确认", en: "Confirm in Feishu" },
  "inbox.returned.cta": { zh: "去飞书修改", en: "Revise in Feishu" },
  "inbox.waitPublish.cta": { zh: "去飞书发布", en: "Publish in Feishu" },
  "inbox.regionAudit.cta": { zh: "去飞书审核", en: "Review in Feishu" },
  "inbox.versionReplaced.cta": { zh: "去飞书查看", en: "View in Feishu" },
  "inbox.problemHandle.cta": { zh: "去飞书处理", en: "Handle in Feishu" },
  "inbox.stuck.cta": { zh: "去飞书排查", en: "Inspect in Feishu" },
  "inbox.prereleaseReview.cta": { zh: "查看物料", en: "Open material" },
  "inbox.prereleaseRejected.cta": { zh: "查看物料", en: "Open material" },
  "inbox.quote.prereleaseReview": { zh: "说明", en: "Note" },
  "inbox.quote.prereleaseRejected": { zh: "驳回原因", en: "Reason" },

  // 字段 label
  "inbox.field.originalFileName": { zh: "原始文件名", en: "Original file" },
  "inbox.field.uploadMethod": { zh: "上传方式", en: "Upload method" },
  "inbox.field.uploadTime": { zh: "上传时间", en: "Upload time" },
  "inbox.field.region": { zh: "区域", en: "Region" },
  "inbox.field.versionNo": { zh: "版本号", en: "Version no." },
  "inbox.field.language": { zh: "语言", en: "Language" },
  "inbox.field.materialName": { zh: "物料名称", en: "Material name" },
  "inbox.field.materialType": { zh: "物料类型", en: "Material type" },
  "inbox.field.productModel": { zh: "产品型号", en: "Product model" },
  "inbox.field.currentVersion": { zh: "当前版本", en: "Current version" },
  "inbox.field.standardName": { zh: "标准命名", en: "Standard name" },
  "inbox.field.receiveRecord": { zh: "领取记录", en: "Download record" },
  "inbox.field.downloadTime": { zh: "领取时间", en: "Download time" },
  "inbox.field.problemTitle": { zh: "问题标题", en: "Issue title" },
  "inbox.field.problemType": { zh: "问题类型", en: "Issue type" },
  "inbox.field.severityLevel": { zh: "严重程度", en: "Severity" },
  "inbox.field.retryCount": { zh: "重试次数", en: "Retry count" },

  // B-3/B-4 就地操作
  "inbox.action.replyPlaceholder": {
    zh: "在这里补充回答，提交后 AI 会继续处理",
    en: "Add your answer here; AI will continue once submitted",
  },
  "inbox.action.replySubmit": { zh: "提交回复", en: "Submit reply" },
  "inbox.action.replyTooLong": {
    zh: "回复太长，请控制在 2000 字以内",
    en: "Reply too long, keep it under 2000 characters",
  },
  "inbox.action.replyDone": {
    zh: "已提交，AI 稍后会继续处理",
    en: "Submitted. AI will continue soon",
  },
  "inbox.action.publish": { zh: "通过并发布", en: "Approve & publish" },
  "inbox.action.store": { zh: "仅入库不发布", en: "Save only" },
  "inbox.action.reject": { zh: "退回修改", en: "Return for revision" },
  "inbox.action.rejectPlaceholder": {
    zh: "请说明退回原因（必填，会写进处理日志）",
    en: "Explain why it's returned (required, written to process log)",
  },
  "inbox.action.back": { zh: "返回", en: "Back" },
  "inbox.action.confirmReject": { zh: "确认退回", en: "Confirm return" },
  "inbox.action.done.publish": {
    zh: "已确认通过，确认后会自动发布",
    en: "Approved. It will publish automatically",
  },
  "inbox.action.done.store": {
    zh: "已确认入库，不会对外发布",
    en: "Saved to library without publishing",
  },
  "inbox.action.done.reject": {
    zh: "已退回，AI 停止处理这条记录",
    en: "Returned. AI stopped processing this record",
  },
  "inbox.action.orInBase": {
    zh: "或多维表格中处理",
    en: "Or handle in Base",
  },
  "inbox.action.failed": {
    zh: "操作失败，请重试",
    en: "Operation failed. Please retry",
  },
};
