/**
 * 按页面拆包：首屏只下载当前页面需要的代码，其余页面在浏览器空闲时或
 * 鼠标悬停到入口时预取，切换页面时通常已在缓存里，不会再等待下载。
 */
export const pageLoaders = {
  inbox: () => import("@client/src/pages/inbox/InboxPage"),
  library: () => import("@client/src/pages/library/LibraryPage"),
  material: () => import("@client/src/pages/material/MaterialDetailPage"),
  mine: () => import("@client/src/pages/mine/MinePage"),
  more: () => import("@client/src/pages/more/MorePage"),
  upload: () => import("@client/src/pages/upload/UploadPage"),
};

export type PageName = keyof typeof pageLoaders;

/** 预取某个页面的代码；重复调用只会命中浏览器模块缓存，没有额外开销 */
export function preloadPage(name: PageName): void {
  void pageLoaders[name]().catch(() => undefined);
}
