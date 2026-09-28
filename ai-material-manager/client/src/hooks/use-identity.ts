import { useQuery } from "@tanstack/react-query";

import { axiosForBackend } from "@client/src/lib/api-client";
import type { Identity } from "@shared/api.interface";

import { initLanguageByMarket } from "@client/src/hooks/use-i18n";

export interface UseIdentityResult {
  identity: Identity | null;
  loading: boolean;
}

export const IDENTITY_QUERY_KEY = ["identity"] as const;

export async function fetchIdentity(): Promise<Identity> {
  const response = await axiosForBackend({
    url: "/api/identity",
    method: "GET",
  });
  const data: Identity = response.data as Identity;
  initLanguageByMarket(data.defaultLanguage);
  return data;
}

/**
 * 当前用户身份。全站共享一份缓存：导航栏、物料库、详情页等多处调用只会请求一次，
 * 并在 5 分钟内复用，避免每次切页都重新解析身份。
 */
export function useIdentity(): UseIdentityResult {
  const { data, isPending } = useQuery({
    queryKey: IDENTITY_QUERY_KEY,
    queryFn: fetchIdentity,
    staleTime: 5 * 60 * 1000,
  });
  return { identity: data ?? null, loading: isPending };
}
