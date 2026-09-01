import { useEffect, useState } from "react";

import { axiosForBackend } from "@client/src/lib/api-client";
import { logger } from "@client/src/lib/logger";
import type { Identity } from "@shared/api.interface";

import { initLanguageByMarket } from "@client/src/hooks/use-i18n";

export interface UseIdentityResult {
  identity: Identity | null;
  loading: boolean;
}

export function useIdentity(): UseIdentityResult {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled: boolean = false;
    const fetchIdentity = async (): Promise<void> => {
      try {
        const response = await axiosForBackend({
          url: "/api/identity",
          method: "GET",
        });
        if (cancelled) {
          return;
        }
        const data: Identity = response.data as Identity;
        setIdentity(data);
        initLanguageByMarket(data.defaultLanguage);
      } catch (error) {
        if (!cancelled) {
          logger.error("获取身份信息失败", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void fetchIdentity();
    return () => {
      cancelled = true;
    };
  }, []);

  return { identity, loading };
}
