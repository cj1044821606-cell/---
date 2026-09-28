export type Language = "zh" | "en";

export interface DictEntry {
  zh: string;
  en: string;
}

export const dictionary: Record<string, DictEntry> = {
  "nav.inbox": { zh: "待办", en: "Inbox" },
  "nav.library": { zh: "物料库", en: "Library" },
  "nav.mine": { zh: "我的", en: "Mine" },
  "nav.more": { zh: "更多", en: "More" },
  "nav.upload": { zh: "上传物料", en: "Upload" },
  "common.loading": { zh: "加载中...", en: "Loading..." },
  "common.empty": { zh: "暂无数据", en: "No data" },
  "common.retry": { zh: "重试", en: "Retry" },
  "common.cancel": { zh: "取消", en: "Cancel" },
  "common.confirm": { zh: "确认", en: "Confirm" },
  "common.save": { zh: "保存", en: "Save" },
  "identity.visitorBanner": {
    zh: "未找到你的市场配置，请联系管理员",
    en: "No market config found for you. Please contact the admin.",
  },
  "library.globalModeBanner": {
    zh: "你正在查看全球物料，部分物料可能不适用于你的市场",
    en: "Viewing global materials. Some may not apply to your market.",
  },
  "lang.switch": { zh: "语言", en: "Language" },
  "lang.zh": { zh: "中文", en: "中文" },
  "lang.en": { zh: "English", en: "English" },
  "groupGuide.title": {
    zh: "加入物料协作群",
    en: "Join the Material Collaboration Group",
  },
  "groupGuide.why": {
    zh: "上传的物料由 AI 自动处理，确认、退回与发布提醒都会在群里通知。进群后才能及时收到与你相关的消息。",
    en: "Uploaded materials are processed by AI. Confirmations, returns and publish reminders are all notified in the group. Join it to receive your messages in time.",
  },
  "groupGuide.step1": {
    zh: "长按或截图保存上方二维码",
    en: "Long-press or screenshot the QR code above",
  },
  "groupGuide.step2": {
    zh: "打开飞书，扫码加入群聊",
    en: "Open Feishu and scan to join the group",
  },
  "groupGuide.step3": {
    zh: "进群后点击下方按钮完成确认",
    en: "After joining, click the button below to confirm",
  },
  "groupGuide.fileReminder": {
    zh: "AI 读不了 .ai / .psd 源文件，上传时必须同时上传导出的 PDF / PNG 文件。",
    en: "AI cannot read .ai / .psd source files. You must also upload the exported PDF / PNG files.",
  },
  "groupGuide.qrFallback": {
    zh: "请联系管理员获取群二维码",
    en: "Please contact the admin for the group QR code",
  },
  "groupGuide.qrExpired": {
    zh: "群二维码已过期，请联系管理员更新",
    en: "The group QR code has expired. Please contact the admin.",
  },
  "groupGuide.unavailable": {
    zh: "二维码暂不可用",
    en: "QR code unavailable",
  },
  "groupGuide.confirm": { zh: "我已进群", en: "I have joined" },
};
