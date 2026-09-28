export interface LibraryI18nEntry {
  zh: string;
  en: string;
}

/**
 * 物料库模块字典。缺 key 时回退中央字典（useI18n 的 t），仍缺则展示 key 本身。
 */
export const LIBRARY_I18N: Record<string, LibraryI18nEntry> = {
  'library.page.subtitle': {
    zh: '浏览你所在市场可见的已发布物料',
    en: 'Browse published materials visible in your market',
  },
  'library.total': {
    zh: '共 {total} 项已发布物料',
    en: '{total} published materials',
  },
  'library.search.placeholder': {
    zh: '搜索物料名称 / 标准命名 / 产品型号',
    en: 'Search name, standard name or model',
  },
  'library.filter.materialType': { zh: '物料类型', en: 'Material type' },
  'library.filter.region': { zh: '适用区域', en: 'Region' },
  'library.filter.productModel': { zh: '产品型号', en: 'Product model' },
  'library.filter.all': { zh: '全部', en: 'All' },
  'library.filter.externalOnly': {
    zh: '仅可外发',
    en: 'Client-shareable only',
  },
  'library.filter.externalOnly.tooltip': {
    zh: '只显示允许分享给客户或渠道的已发布物料',
    en: 'Show only published materials approved for client or channel sharing',
  },
  'library.viewGlobal.label': { zh: '查看全球', en: 'View global' },
  'library.viewGlobal.tooltip': {
    zh: '显示其他区域的已发布物料，需要相应权限',
    en: 'Show published materials from other regions; permission required',
  },
  'library.viewGlobal.banner': {
    zh: '正在查看全球物料：已跳过市场过滤，仍仅展示已发布内容',
    en: 'Viewing global materials: market filter skipped, published items only',
  },
  'library.tab.materials': { zh: '按物料', en: 'By material' },
  'library.tab.kits': { zh: '按资料包', en: 'By kit' },
  'library.empty.title': {
    zh: '没有符合条件的物料',
    en: 'No matching materials',
  },
  'library.empty.description': {
    zh: '换个关键词或筛选条件试试，也可以提一个新的物料需求',
    en: 'Try different keywords or filters, or request a new material',
  },
  'library.empty.request': { zh: '提个物料需求', en: 'Request a material' },
  'library.empty.noForm': {
    zh: '暂未配置需求表单，请联系管理员',
    en: 'No request form configured yet, please contact an admin',
  },
  'library.error.load': {
    zh: '物料加载失败，请重试',
    en: 'Failed to load materials, please retry',
  },
  'library.error.loadKits': {
    zh: '资料包加载失败，请重试',
    en: 'Failed to load kits, please retry',
  },
  'library.kit.count': { zh: '{count} 项物料', en: '{count} materials' },
  'library.kit.receive': { zh: '领取整包', en: 'Receive kit' },
  'library.kit.received': { zh: '已领取', en: 'Received' },
  'library.kit.toast.done': {
    zh: '已领取 {created} 项，跳过 {skipped} 项',
    en: 'Received {created}, skipped {skipped}',
  },
  'library.kit.toast.error': {
    zh: '领取失败，请重试',
    en: 'Failed to receive, please retry',
  },
  'library.meta.available': { zh: '件可用', en: 'available' },
  'library.meta.area': {
    zh: '你在 {area}，看到的是本区 + 全区域物料',
    en: 'You are in {area}: showing local + global materials',
  },
  'library.filter.clear': { zh: '清除筛选', en: 'Clear filters' },
  'library.search.clear': { zh: '清空搜索', en: 'Clear search' },
  'library.filter.activeTitle': { zh: '已筛选', en: 'Filtered by' },
  'library.filter.remove': { zh: '移除筛选', en: 'Remove filter' },
  'library.filter.keyword': { zh: '关键词', en: 'Keyword' },
  'library.filter.scope': { zh: '范围', en: 'Scope' },
  'library.backToTop': { zh: '回到顶部', en: 'Back to top' },
  'library.search.shortcut': {
    zh: '按 / 快速搜索，Esc 清空',
    en: 'Press / to search, Esc to clear',
  },
  'library.syncing': { zh: '正在同步最新数据', en: 'Syncing latest' },
  'library.progress': {
    zh: '已显示 {loaded} / {total}',
    en: 'Showing {loaded} of {total}',
  },
  'library.refresh': { zh: '刷新物料库', en: 'Refresh library' },
  'library.error.stale': {
    zh: '同步失败，当前显示缓存，物料状态可能已变化',
    en: 'Sync failed. Cached materials may be out of date.',
  },
  'library.loadMore': { zh: '加载更多', en: 'Load more' },
  'library.loadingMore': { zh: '加载中…', en: 'Loading…' },
  'library.others.title': {
    zh: '其他物料（品牌 / 展会 / 无型号）',
    en: 'Other materials (brand / expo / no model)',
  },
};
