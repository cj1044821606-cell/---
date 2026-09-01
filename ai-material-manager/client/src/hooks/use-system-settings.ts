import { useEffect, useState } from "react";

import { logger } from "@client/src/lib/logger";
import { getSystemSettings } from "@client/src/api/settings";
import type { SystemSettings } from "@shared/api.interface";

export function useSystemSettings(): SystemSettings | null {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    let cancelled: boolean = false;
    getSystemSettings()
      .then((data: SystemSettings) => {
        if (!cancelled) {
          setSettings(data);
        }
      })
      .catch((error: unknown) => {
        logger.error("获取系统配置失败", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
