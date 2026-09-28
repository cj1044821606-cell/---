import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getSystemSettings } from "@client/src/api/settings";
import { getGroupQrStatus, GROUP_QR_EXPIRING_WINDOW_MS } from "@shared/settings";
import type { SystemSettings } from "@shared/api.interface";

/** Base 配置低频变更，但短期二维码需要较快传播更新。 */
export function useSystemSettings(): SystemSettings | null {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: getSystemSettings,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const expiryMs = data?.groupQrExpiry
      ? new Date(data.groupQrExpiry).getTime()
      : null;
    if (
      expiryMs === null ||
      !Number.isFinite(expiryMs) ||
      nowMs >= expiryMs ||
      (data?.groupQrStatus !== "available" && data?.groupQrStatus !== "expiring")
    ) {
      return;
    }

    const thresholdMs = expiryMs - GROUP_QR_EXPIRING_WINDOW_MS;
    const nextTransitionMs = nowMs < thresholdMs ? thresholdMs : expiryMs;
    const timer = window.setTimeout(
      () => setNowMs(Date.now()),
      Math.max(0, nextTransitionMs - nowMs + 25),
    );
    return () => window.clearTimeout(timer);
  }, [data?.groupQrExpiry, data?.groupQrStatus, nowMs]);

  if (!data) return null;
  if (data.groupQrStatus === "unavailable" || data.groupQrStatus === "expired") {
    return data;
  }

  const expiryMs = data.groupQrExpiry
    ? new Date(data.groupQrExpiry).getTime()
    : null;
  const groupQrStatus = getGroupQrStatus(
    true,
    Boolean(data.groupQrUrl),
    expiryMs,
    nowMs,
  );
  return {
    ...data,
    groupQrStatus,
    groupQrUrl:
      groupQrStatus === "expired" || groupQrStatus === "unavailable"
        ? null
        : data.groupQrUrl,
  };
}
