import type { Language } from "@client/src/i18n/dictionary";

/** 「我的」页本地文案字典 */
export const MINE_I18N: Record<string, { zh: string; en: string }> = {
  "mine.subtitle": { zh: "个人资产工作区", en: "Personal workspace" },
  "mine.upload": { zh: "上传物料", en: "Upload material" },
  "mine.uploadDesc": {
    zh: "通过上传表单提交新物料，进入 AI 处理流程",
    en: "Submit new materials via the upload form",
  },
  "mine.uploadConfigMissing": {
    zh: "上传表单链接未配置，请联系管理员",
    en: "Upload form URL is not configured. Please contact the admin.",
  },
  "mine.groupJoined": { zh: "已进群", en: "In group" },
  "mine.groupNotJoined": { zh: "未进群", en: "Not in group" },
  "mine.viewQr": { zh: "查看群二维码", en: "View group QR" },
  "mine.roles": { zh: "角色", en: "Roles" },
  "mine.area": { zh: "市场码", en: "Market" },
  "mine.landing": { zh: "默认落地页", en: "Default landing" },
  "mine.landing.inbox": { zh: "待办收件箱", en: "Inbox" },
  "mine.landing.library": { zh: "物料库", en: "Library" },
  "mine.roleNone": { zh: "未识别角色", en: "No role" },
  "mine.areaNone": { zh: "未知市场", en: "Unknown" },
  "mine.guest": { zh: "游客", en: "Guest" },
  "mine.tab.received": { zh: "我领过的", en: "Received" },
  "mine.tab.subscribed": { zh: "我订阅的", en: "Subscribed" },
  "mine.tab.handled": { zh: "我经手的", en: "Handled" },
  "mine.pool.title": { zh: "我提交的物料 · 进度", en: "My uploads · Progress" },
  "mine.pool.role.uploader": { zh: "上传者", en: "Uploader" },
  "mine.pool.role.designer": { zh: "设计师", en: "Designer" },
  "mine.pool.role.planner": { zh: "策划审核", en: "Planner" },
  "mine.syncing": { zh: "同步中", en: "Syncing" },
  "mine.expired": { zh: "已失效", en: "Outdated" },
  "mine.untitled": { zh: "未命名物料", en: "Untitled material" },
  "mine.noVersion": { zh: "无版本", en: "No version" },
  "mine.empty.received": { zh: "还没有领取记录", en: "No received records" },
  "mine.empty.receivedDesc": {
    zh: "在物料详情页领取后，会出现在这里",
    en: "Materials you receive will show up here",
  },
  "mine.empty.subscribed": { zh: "还没有订阅物料", en: "No subscriptions" },
  "mine.empty.subscribedDesc": {
    zh: "订阅物料后，版本更新会第一时间通知你",
    en: "Subscribe to materials to get version updates",
  },
  "mine.empty.handled": { zh: "还没有经手记录", en: "No handled records" },
  "mine.empty.handledDesc": {
    zh: "你作为策划或设计师参与的物料会出现在这里",
    en: "Materials you handled as planner or designer will show up here",
  },
  "mine.error": { zh: "加载失败，请稍后重试", en: "Failed to load. Try again" },
  "mine.retry": { zh: "重试", en: "Retry" },
  "mine.role.planner": { zh: "策划", en: "Planner" },
  "mine.role.designer": { zh: "设计师", en: "Designer" },
  "mine.stage.waitPublish": { zh: "等你点发布", en: "Waiting on you" },
  "mine.stage.published": { zh: "已发布", en: "Published" },
  "mine.stage.offline": { zh: "已下架", en: "Offline" },
};

/** 本地字典优先，缺失时回退全局字典 */
export function makePt(
  language: Language,
  t: (key: string) => string,
): (key: string) => string {
  return (key: string): string => MINE_I18N[key]?.[language] ?? t(key);
}
