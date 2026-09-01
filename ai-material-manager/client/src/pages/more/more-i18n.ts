/**
 * 「更多」页本地文案字典。
 * 命名规则三大类结构提炼自原型说明书
 * （.agent/conversation_4kucd9hf46e9h/attachments/prototype/
 *  README-给妙搭的适配说明书.md 与 index.html「命名规则速查」面板）。
 */
export const MORE_I18N: Record<string, { zh: string; en: string }> = {
  "more.title": { zh: "更多", en: "More" },
  "more.subtitle": {
    zh: "规则速查与系统健康度",
    en: "Quick reference & system health",
  },

  // 命名规则速查
  "more.naming.title": { zh: "命名规则速查", en: "Naming rules" },
  "more.naming.product": { zh: "产品物料", en: "Product material" },
  "more.naming.product.tpl": {
    zh: "产品型号-物料类型-语言-(区域)-版本号",
    en: "Model-MaterialType-Language-(Region)-Version",
  },
  "more.naming.product.example": {
    zh: "IPV-1K612U-Datasheet-En-(PK)-V1.0",
    en: "IPV-1K612U-Datasheet-En-(PK)-V1.0",
  },
  "more.naming.brand": { zh: "品牌物料", en: "Brand material" },
  "more.naming.brand.tpl": {
    zh: "物料类型-语言-(区域)-版本号（Logo 带品牌）",
    en: "MaterialType-Language-(Region)-Version (logo carries brand)",
  },
  "more.naming.brand.example": {
    zh: "Brochure-En-(PK)-V1.0 / itel-Logo-V1.0",
    en: "Brochure-En-(PK)-V1.0 / itel-Logo-V1.0",
  },
  "more.naming.expo": { zh: "展会物料", en: "Exhibition material" },
  "more.naming.expo.tpl": {
    zh: "(年份)展会缩写-物料类型-(区域)-版本号（无语言）",
    en: "(Year)ExpoCode-MaterialType-(Region)-Version (no language)",
  },
  "more.naming.expo.example": {
    zh: "(2026)GITEX-Poster-(PK)-V1.0",
    en: "(2026)GITEX-Poster-(PK)-V1.0",
  },

  // 状态标签说明
  "more.status.title": { zh: "状态标签怎么读", en: "How to read status" },
  "more.status.ok.desc": {
    zh: "已发布 + 正式版 + 当前有效 → 放心领",
    en: "Published + official + valid → safe to take",
  },
  "more.status.mute.desc": {
    zh: "还在识别 / 待确认 / 待发布 → 等着",
    en: "Recognizing / pending confirm / pending publish → wait",
  },
  "more.status.warn.desc": {
    zh: "需要你补充或确认 → 去待办处理",
    en: "Needs your input or confirm → go to inbox",
  },
  "more.status.bad.desc": {
    zh: "已下架 / 已替代 / 已废弃 → 别用了",
    en: "Taken down / replaced / deprecated → do not use",
  },

  // 语言切换
  "more.language.title": { zh: "语言", en: "Language" },
  "more.language.hint": {
    zh: "切换后立即生效并记住",
    en: "Applies instantly and is remembered",
  },

  // 协作群
  "more.group.title": { zh: "协作群", en: "Collaboration group" },
  "more.group.desc": {
    zh: "AI 版本经理在群里工作，你的追问和确认卡都从群里来。",
    en: "The AI version manager works in this group. Follow-ups and confirm cards come from here.",
  },
  "more.group.joined": { zh: "已加入", en: "Joined" },
  "more.group.notJoined": { zh: "未加入", en: "Not joined" },
  "more.group.view": { zh: "查看群二维码", en: "View group QR" },
  "more.group.expiry": { zh: "二维码有效期至", en: "QR valid until" },
  "more.group.internal": {
    zh: "仅限企业内部成员",
    en: "Internal members only",
  },

  // 运维视图
  "more.ops.title": { zh: "运维视图 · 仅维护者可见", en: "Ops · Maintainers only" },
  "more.ops.stuck": { zh: "卡住的记录（重试≥3）", en: "Stuck records (retries ≥ 3)" },
  "more.ops.col.file": { zh: "文件名", en: "File" },
  "more.ops.col.retry": { zh: "重试次数", en: "Retries" },
  "more.ops.col.log": { zh: "日志摘要", en: "Log summary" },
  "more.ops.col.waitDays": { zh: "等待天数", en: "Waiting" },
  "more.ops.overdue": { zh: "待确认超 3 天", en: "Confirm pending > 3 days" },
  "more.ops.qrAlert": { zh: "群二维码临期告警", en: "Group QR expiry alert" },
  "more.ops.qr.expiring": {
    zh: "群二维码即将到期（≤3 天），请尽快在系统配置中更新",
    en: "Group QR expires within 3 days — update it in system config",
  },
  "more.ops.qr.ok": { zh: "二维码有效，暂未临期", en: "QR valid, not expiring" },
  "more.ops.qr.none": { zh: "未配置群二维码", en: "No group QR configured" },
  "more.ops.qr.expiry": { zh: "有效期至", en: "Valid until" },
  "more.ops.health": { zh: "数据体检", en: "Data health" },
  "more.ops.health.materialTotal": { zh: "物料总数", en: "Materials total" },
  "more.ops.health.materialPublished": {
    zh: "已发布物料数",
    en: "Published materials",
  },
  "more.ops.health.aiPendingTotal": {
    zh: "AI 待处理池总数",
    en: "AI pending pool total",
  },
  "more.ops.health.failedPending": { zh: "失败待处理数", en: "Failed pending" },
  "more.ops.health.feedbackPending": {
    zh: "待处理问题反馈数",
    en: "Open feedback",
  },
  "more.ops.sync": { zh: "同步延迟说明", en: "Sync delay" },
  "more.ops.loadFailed": { zh: "运维数据加载失败", en: "Failed to load ops data" },
  "more.ops.retry": { zh: "重试", en: "Retry" },

  "more.empty": { zh: "暂无", en: "None" },
  "more.days": { zh: "天", en: "d" },
  "more.upload.title": {
    zh: "上传新物料",
    en: "Upload new material",
  },
  "more.upload.desc": {
    zh: "把设计文件交给 AI，自动识别入库，进度可在待办箱追踪",
    en: "Hand your file to AI for auto recognition. Track progress in inbox",
  },
  "more.upload.cta": {
    zh: "去上传",
    en: "Upload",
  },
};
