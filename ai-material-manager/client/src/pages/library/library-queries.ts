import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from '@tanstack/react-query';

import type {
  MaterialDetailResponse,
  MaterialKitsResponse,
  MaterialListParams,
  MaterialListResponse,
} from '@shared/material';
import {
  getMaterialDetail,
  getMaterialKits,
  getMaterialList,
} from '@client/src/api/materials';
import { hasPersistedCache, queryClient } from '@client/src/lib/query-client';

/** 服务端单页上限为 50 */
export const LIBRARY_PAGE_SIZE: number = 50;
/** 1 分钟内回到物料库直接用缓存，不再请求；超过后先显示缓存再后台刷新 */
const LIBRARY_STALE_MS: number = 60_000;
const DETAIL_STALE_MS: number = 30_000;

export type LibraryFilters = Omit<MaterialListParams, 'offset' | 'limit'>;

export const ALL_VALUE: string = '__all__';

/** 筛选条件全部写进 URL：刷新、分享链接、从详情页返回都能保持原样 */
export const LIBRARY_PARAM = {
  keyword: 'q',
  materialType: 'materialType',
  region: 'region',
  productModel: 'model',
  externalOnly: 'external',
  viewGlobal: 'global',
  view: 'view',
} as const;

/** URL → 查询条件。物料库页面与启动预取共用，保证缓存键完全一致 */
export function parseLibraryFilters(
  params: URLSearchParams,
  canViewGlobal: boolean,
): LibraryFilters {
  const pick = (key: string): string | undefined => {
    const value = params.get(key);
    return value !== null && value !== '' && value !== ALL_VALUE
      ? value
      : undefined;
  };
  return {
    keyword: pick(LIBRARY_PARAM.keyword),
    materialType: pick(LIBRARY_PARAM.materialType),
    region: pick(LIBRARY_PARAM.region),
    productModel: pick(LIBRARY_PARAM.productModel),
    externalOnly:
      params.get(LIBRARY_PARAM.externalOnly) === '1' ? true : undefined,
    viewGlobal:
      canViewGlobal && params.get(LIBRARY_PARAM.viewGlobal) === '1'
        ? true
        : undefined,
  };
}

export function materialsQueryKey(filters: LibraryFilters) {
  return ['materials', filters] as const;
}

function materialListOptions(filters: LibraryFilters) {
  return {
    queryKey: materialsQueryKey(filters),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      getMaterialList({
        ...filters,
        offset: pageParam,
        limit: LIBRARY_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (
      lastPage: MaterialListResponse,
      allPages: MaterialListResponse[],
    ): number | undefined => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.total && lastPage.items.length > 0
        ? loaded
        : undefined;
    },
    staleTime: LIBRARY_STALE_MS,
    refetchInterval: LIBRARY_STALE_MS,
    refetchOnWindowFocus: true,
  };
}

export function useMaterialList(filters: LibraryFilters, enabled = true) {
  return useInfiniteQuery<
    MaterialListResponse,
    Error,
    InfiniteData<MaterialListResponse, number>,
    ReturnType<typeof materialsQueryKey>,
    number
  >({
    ...materialListOptions(filters),
    enabled,
    // 切换筛选时保留上一次结果（半透明），不闪回骨架屏
    placeholderData: keepPreviousData,
  });
}

/**
 * 启动时直接打开物料库的情况下，与登录校验、页面代码下载并行发起列表请求，
 * 而不是等页面渲染后再开始。“查看全球”依赖身份判断，此时不预取。
 */
export function prefetchLibraryFromLocation(location: Location): void {
  if (location.pathname !== '/library') return;
  // 有本地缓存时由持久化层先秒开再后台刷新，这里不重复请求
  if (hasPersistedCache()) return;
  const params = new URLSearchParams(location.search);
  if (params.get(LIBRARY_PARAM.viewGlobal) === '1') return;
  if (params.get(LIBRARY_PARAM.view) === 'kits') return;
  void queryClient.prefetchInfiniteQuery(
    materialListOptions(parseLibraryFilters(params, false)),
  );
}

export function useMaterialKits(enabled: boolean) {
  return useQuery<MaterialKitsResponse>({
    queryKey: ['material-kits'],
    queryFn: getMaterialKits,
    staleTime: LIBRARY_STALE_MS,
    refetchInterval: LIBRARY_STALE_MS,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function materialDetailQueryKey(baseRecordId: string) {
  return ['material', baseRecordId] as const;
}

/** 读取物料详情：悬停预取过的会直接命中缓存，否则发起请求 */
export function fetchMaterialDetailCached(
  baseRecordId: string,
): Promise<MaterialDetailResponse> {
  return queryClient.fetchQuery({
    queryKey: materialDetailQueryKey(baseRecordId),
    queryFn: () => getMaterialDetail(baseRecordId),
    staleTime: DETAIL_STALE_MS,
  });
}

/** 鼠标悬停 / 手指按下卡片时预取详情，点进去时数据往往已经就绪 */
export function prefetchMaterialDetail(baseRecordId: string): void {
  void queryClient.prefetchQuery({
    queryKey: materialDetailQueryKey(baseRecordId),
    queryFn: () => getMaterialDetail(baseRecordId),
    staleTime: DETAIL_STALE_MS,
  });
}

/** 物料被编辑、下架或恢复后，让列表与资料包在下次查看时重新拉取 */
export function invalidateLibrary(baseRecordId?: string): void {
  void queryClient.invalidateQueries({ queryKey: ['materials'] });
  void queryClient.invalidateQueries({ queryKey: ['material-kits'] });
  if (baseRecordId) {
    queryClient.removeQueries({
      queryKey: materialDetailQueryKey(baseRecordId),
    });
  }
}
