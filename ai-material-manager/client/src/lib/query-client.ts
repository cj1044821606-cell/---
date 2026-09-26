import { QueryClient, type Query } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";

/**
 * 全站共享的数据缓存（TanStack Query）。
 *
 * - 同一份数据（身份、系统配置、物料列表）在多个组件间只请求一次；
 * - 切页再回来先展示缓存，再在后台静默刷新（stale-while-revalidate）；
 * - 物料库等浏览型数据额外写入 localStorage，下次打开页面立即有内容可看。
 */
export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** 需要持久化到 localStorage 的查询前缀；写操作相关、实时性强的数据不落盘 */
const PERSISTED_ROOTS: ReadonlySet<string> = new Set<string>([
  "identity",
  "settings",
  "materials",
  "material-kits",
]);

export const QUERY_CACHE_STORAGE_KEY = "amm.query-cache.v1";

function canUseLocalStorage(): boolean {
  try {
    const probe = "__amm_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function createPersistOptions(): Omit<PersistQueryClientOptions, "queryClient"> | null {
  if (typeof window === "undefined" || !canUseLocalStorage()) return null;
  return {
    persister: createSyncStoragePersister({
      storage: window.localStorage,
      key: QUERY_CACHE_STORAGE_KEY,
      throttleTime: 1_000,
    }),
    maxAge: 24 * 60 * 60 * 1000,
    // 发版后旧缓存结构可能不兼容，版本号变化即丢弃
    buster: __APP_BUILD_ID__,
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query): boolean =>
        query.state.status === "success" &&
        PERSISTED_ROOTS.has(String(query.queryKey[0])),
    },
  };
}

export function hasPersistedCache(): boolean {
  try {
    return window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** 退出登录时清空内存与本地缓存，避免下一位使用者看到上一位的数据 */
export function clearQueryCache(): void {
  queryClient.clear();
  try {
    window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  } catch {
    // 存储不可用时忽略
  }
}
