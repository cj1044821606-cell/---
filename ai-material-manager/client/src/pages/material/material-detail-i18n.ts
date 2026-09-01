export interface MaterialDetailI18nEntry {
  zh: string;
  en: string;
}

/**
 * 物料详情模块本地字典。缺 key 时回退展示 key 本身。
 * 支持 `{name}` 变量插值：pt("edit.dirtyHint", { n: 2 })。
 */
export const MATERIAL_DETAIL_I18N: Record<string, MaterialDetailI18nEntry> = {
  // 页面
  "detail.pageTitle": { zh: "物料详情", en: "Material detail" },
  "detail.back": { zh: "返回", en: "Back" },
  "detail.edit": { zh: "编辑信息", en: "Edit info" },
  "detail.editNoPermission": {
    zh: "你的角色（{roles}）没有编辑权限",
    en: "Your role ({roles}) has no edit permission",
  },
  "detail.error.load": {
    zh: "物料详情加载失败，请重试",
    en: "Failed to load material. Please retry",
  },
  "detail.notFound.title": {
    zh: "物料不存在或已删除",
    en: "Material not found or removed",
  },
  "detail.notFound.desc": {
    zh: "请返回物料库重新查找",
    en: "Go back to the library and search again",
  },

  // 旧版拦截横幅
  "banner.old.title": {
    zh: "你领的版本已被新版替代",
    en: "Your downloaded version was replaced",
  },
  "banner.old.desc": {
    zh: "请切换到新版继续使用，避免内容过期",
    en: "Switch to the new version to avoid outdated content",
  },
  "banner.old.cta": { zh: "查看新版", en: "View new version" },
  "banner.current": {
    zh: "你正在查看当前有效版本",
    en: "You are viewing the current valid version",
  },

  // 文件
  "files.title": { zh: "文件", en: "Files" },
  "files.empty": { zh: "暂无可下载文件", en: "No files available" },
  "files.largeFileNote": {
    zh: "大文件，将通过云盘链接下发",
    en: "Large file — delivered via cloud link",
  },
  "files.cloudLink": { zh: "云盘链接", en: "Cloud disk link" },
  "files.exportM": { zh: "导出件 M", en: "Export M" },
  "files.sourceL": { zh: "源文件 L", en: "Source L" },
  "files.previewS": { zh: "预览 S", en: "Preview S" },

  // 动作
  "action.receive": { zh: "领取下载", en: "Download" },
  "action.claimed": { zh: "已领取", en: "Downloaded" },
  "action.retired": { zh: "该版本已停用", en: "This version is retired" },
  "action.redownload": { zh: "重新下载", en: "Download again" },
  "action.subscribe": { zh: "订阅更新", en: "Subscribe" },
  "action.subscribed": { zh: "已订阅更新", en: "Subscribed" },
  "action.report": { zh: "报问题", en: "Report issue" },
  "action.share": { zh: "分享给客户", en: "Share to client" },
  "action.retire": { zh: "下架", en: "Retire" },
  "action.restore": { zh: "重新上架", en: "Restore" },
  "action.retireFail": { zh: "下架失败，请重试", en: "Retire failed. Please retry" },
  "action.restoreFail": { zh: "重新上架失败，请重试", en: "Restore failed. Please retry" },
  "action.receiveFail": { zh: "领取失败，请重试", en: "Download failed. Please retry" },
  "action.subscribeFail": {
    zh: "订阅操作失败，请重试",
    en: "Subscription update failed. Please retry",
  },
  "action.receiveToastFallback": {
    zh: "已领取，文件同步可能略有延迟",
    en: "Downloaded. File sync may be slightly delayed",
  },
  "gate.notPublic": {
    zh: "此物料不允许发给客户，仅供内部使用",
    en: "This asset must NOT be sent to clients. Internal use only.",
  },

  // 分享确认
  "share.title": { zh: "确认分享给客户", en: "Confirm sharing to client" },
  "share.desc": {
    zh: "外发前请确认内容合规且适用于客户场景",
    en: "Make sure the content is compliant and suitable for the client",
  },
  "share.file": { zh: "文件名", en: "File name" },
  "share.version": { zh: "版本号", en: "Version" },
  "share.confirm": { zh: "确认分享", en: "Confirm share" },
  "share.success": {
    zh: "已确认，请通过合规渠道发送",
    en: "Confirmed. Send via compliant channels",
  },
  "share.blocked": {
    zh: "该物料当前不满足外发条件",
    en: "This asset is not eligible for external sharing",
  },

  // 报问题
  "feedback.title": { zh: "报问题", en: "Report an issue" },
  "feedback.desc": {
    zh: "反馈会通知策划与维护者跟进",
    en: "Owners and maintainers will be notified",
  },
  "feedback.submit": { zh: "提交反馈", en: "Submit" },
  "feedback.success": { zh: "反馈已提交，感谢", en: "Feedback submitted. Thank you" },
  "feedback.error": { zh: "反馈提交失败，请重试", en: "Failed to submit. Please retry" },
  "feedback.field.title": { zh: "问题标题", en: "Issue title" },
  "feedback.field.type": { zh: "问题类型", en: "Issue type" },
  "feedback.field.description": { zh: "问题描述", en: "Description" },
  "feedback.field.severity": { zh: "严重程度", en: "Severity" },
  "feedback.ph.title": { zh: "一句话说明问题", en: "Summarize the issue in one line" },
  "feedback.ph.type": { zh: "请选择问题类型", en: "Select issue type" },
  "feedback.ph.description": {
    zh: "补充具体情况，便于定位处理",
    en: "Add details to help locate the issue",
  },
  "feedback.ph.severity": { zh: "请选择严重程度", en: "Select severity" },
  "feedback.err.titleRequired": { zh: "请填写问题标题", en: "Issue title is required" },
  "feedback.err.titleMax": {
    zh: "问题标题不超过 100 字",
    en: "Title must be within 100 characters",
  },
  "feedback.err.typeRequired": { zh: "请选择问题类型", en: "Please select an issue type" },
  "feedback.err.descRequired": { zh: "请填写问题描述", en: "Description is required" },
  "feedback.err.severityRequired": { zh: "请选择严重程度", en: "Please select severity" },
  "feedback.type.content": { zh: "内容错误", en: "Wrong content" },
  "feedback.type.corrupt": { zh: "文件损坏", en: "Corrupted file" },
  "feedback.type.version": { zh: "版本错误", en: "Wrong version" },
  "feedback.type.other": { zh: "其他", en: "Other" },
  "feedback.sev.normal": { zh: "一般", en: "Normal" },
  "feedback.sev.important": { zh: "重要", en: "Important" },
  "feedback.sev.urgent": { zh: "紧急", en: "Urgent" },

  // 下架 / 重新上架
  "retire.title": { zh: "下架「{name}」", en: "Retire \"{name}\"" },
  "retire.desc": {
    zh: "下架后，该物料将从所有人的物料库中消失。已领用的同事不会被回收，但会看到「已过期」标记。",
    en: "This material will be removed from the library. Downloaded copies will not be revoked, but will show an 'expired' badge.",
  },
  "retire.subscriberNote": {
    zh: "{n} 位订阅者会收到下架通知",
    en: "{n} subscriber(s) will be notified",
  },
  "retire.reasonLabel": { zh: "下架原因（必填）", en: "Retire reason (required)" },
  "retire.reasonPlaceholder": {
    zh: "请填写下架原因",
    en: "Please provide a reason for retiring",
  },
  "retire.charsLeft": { zh: "还可输入 {n} 字", en: "{n} characters left" },
  "retire.confirm": { zh: "确认下架", en: "Confirm retire" },
  "retire.success": {
    zh: "已下架，约 30 秒后全站生效",
    en: "Retired. Takes effect across the site in ~30s",
  },
  "restore.title": { zh: "重新上架「{name}」", en: "Restore \"{name}\"" },
  "restore.desc": {
    zh: "重新上架后，该物料会重新出现在物料库中。",
    en: "This material will reappear in the library.",
  },
  "restore.warn": {
    zh: "{n} 位订阅者会再收到一次发布通知",
    en: "{n} subscriber(s) will receive another publish notification",
  },
  "restore.reasonLabel": { zh: "上架原因（必填）", en: "Restore reason (required)" },
  "restore.reasonPlaceholder": {
    zh: "请填写上架原因",
    en: "Please provide a reason for restoring",
  },
  "restore.confirm": { zh: "确认上架", en: "Confirm restore" },
  "restore.success": {
    zh: "已重新上架，约 30 秒后全站生效",
    en: "Restored. Takes effect across the site in ~30s",
  },

  // 身份状态区
  "identity.recommended": { zh: "推荐使用", en: "Recommended" },
  "identity.kv.model": { zh: "产品型号", en: "Product model" },
  "identity.kv.type": { zh: "物料类型", en: "Material type" },
  "identity.kv.language": { zh: "语言", en: "Language" },
  "identity.kv.region": { zh: "适用区域", en: "Regions" },
  "identity.kv.currentVersion": { zh: "当前版本", en: "Current version" },
  "identity.kv.innerNo": { zh: "内部编号", en: "Internal no." },

  // 编辑模式
  "edit.note": {
    zh: "仅白名单字段可编辑；锁定字段由系统或上游数据维护",
    en: "Only whitelisted fields are editable; locked fields are system-managed",
  },
  "edit.fieldTitle": { zh: "物料名称", en: "Material name" },
  "edit.recommended": { zh: "是否推荐", en: "Recommended" },
  "edit.validity": { zh: "有效期", en: "Valid until" },
  "edit.validity.empty": { zh: "选择日期", en: "Pick a date" },
  "edit.riskLabel": { zh: "风险标签", en: "Risk labels" },
  "edit.language": { zh: "语言", en: "Language" },
  "edit.region": { zh: "适用区域", en: "Regions" },
  "edit.lockedTitle": { zh: "锁定字段", en: "Locked fields" },
  "lock.standardName": {
    zh: "标准命名由 AI 命名规则统一维护",
    en: "Standard naming is managed by AI naming rules",
  },
  "lock.model": { zh: "型号同步自产品主数据", en: "Model syncs from product master data" },
  "lock.type": { zh: "类型由物料类型体系统一维护", en: "Type is managed by the taxonomy" },
  "lock.currentVersion": {
    zh: "版本由发布流程决定",
    en: "Version is decided by the release flow",
  },
  "lock.innerNo": { zh: "系统生成，全局唯一", en: "System-generated, globally unique" },
  "edit.dirtyHint": { zh: "已修改 {n} 项，未保存", en: "{n} unsaved change(s)" },
  "edit.save": { zh: "保存", en: "Save" },
  "edit.saving": { zh: "保存中", en: "Saving" },
  "edit.cancel": { zh: "取消", en: "Cancel" },
  "edit.saveFail": { zh: "保存失败，请重试", en: "Save failed. Please retry" },
  "edit.savedApplied": { zh: "已保存，实际写入：{fields}", en: "Saved. Applied: {fields}" },
  "edit.discard": { zh: "已放弃 {n} 项修改", en: "Discarded {n} change(s)" },
  "edit.field.materialName": { zh: "物料名称", en: "Material name" },
  "edit.field.isRecommended": { zh: "是否推荐", en: "Recommended" },
  "edit.field.validityPeriod": { zh: "有效期", en: "Valid until" },
  "edit.field.riskLabel": { zh: "风险标签", en: "Risk labels" },
  "edit.field.appLanguage": { zh: "语言", en: "Language" },
  "edit.field.applicableRegion": { zh: "适用区域", en: "Regions" },

  // 溯源
  "prov.title": { zh: "溯源", en: "Provenance" },
  "prov.planner": { zh: "策划及审核人", en: "Owner / Approver" },
  "prov.designer": { zh: "设计师", en: "Designer" },
  "prov.publishTime": { zh: "发布时间", en: "Published" },
  "prov.subscribers": { zh: "订阅者", en: "Subscribers" },
  "prov.innerId": { zh: "内部物料ID", en: "Internal ID" },

  // 版本时间线
  "timeline.title": { zh: "版本时间线", en: "Version history" },
  "timeline.count": { zh: "共 {n} 个版本", en: "{n} versions" },
  "timeline.current": { zh: "当前有效", en: "Current" },
  "timeline.receivedAt": {
    zh: "你领过这版 · {date}",
    en: "You downloaded this · {date}",
  },
};

export type MaterialDetailPt = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export function createMaterialDetailPt(
  language: "zh" | "en",
): MaterialDetailPt {
  return (key: string, vars?: Record<string, string | number>): string => {
    const entry: MaterialDetailI18nEntry | undefined =
      MATERIAL_DETAIL_I18N[key];
    let text: string = entry ? entry[language] : key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  };
}
