import { useQuery } from "@tanstack/react-query";

import { getSystemSettings } from "@client/src/api/settings";
import type { SystemSettings } from "@shared/api.interface";

/** 系统配置变化频率很低：全站共享一份缓存，10 分钟内不重复请求 */
export function useSystemSettings(): SystemSettings | null {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: getSystemSettings,
    staleTime: 10 * 60 * 1000,
  });
  return data ?? null;
}
