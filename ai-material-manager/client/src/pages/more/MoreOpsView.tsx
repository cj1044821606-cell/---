import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  HeartPulse,
  QrCode,
  RefreshCcw,
  Timer,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import dayjs from "dayjs";

import { logger } from "@client/src/lib/logger";
import { Button } from "@client/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/src/components/ui/card";
import { Skeleton } from "@client/src/components/ui/skeleton";
import { getOps } from "@client/src/api/ops";
import { useI18n } from "@client/src/hooks/use-i18n";
import { useSystemSettings } from "@client/src/hooks/use-system-settings";
import type {
  OpsHealthItem,
  OpsOverdueItem,
  OpsResponse,
  OpsStuckItem,
} from "@shared/api.interface";
import { MORE_I18N } from "./more-i18n";

const headerClass = "p-4 pb-2";
const contentClass = "p-4 pt-0";
const tableHeadCellClass =
  "pb-2 text-xs font-normal text-muted-foreground";

const EmptyCell: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-3 text-center text-xs text-muted-foreground">{text}</div>
);

export const MoreOpsView: React.FC = () => {
  const { language, t } = useI18n();
  const settings = useSystemSettings();
  const [data, setData] = useState<OpsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);

  const pt = (key: string): string => MORE_I18N[key]?.[language] ?? t(key);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setFailed(false);
    try {
      const result: OpsResponse = await getOps();
      setData(result);
    } catch (err: unknown) {
      logger.error("获取运维数据失败", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const expiryText: string | null =
    data?.qrAlert?.expiry && dayjs(data.qrAlert.expiry).isValid()
      ? dayjs(data.qrAlert.expiry).format("YYYY-MM-DD")
      : null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Wrench className="size-4 text-primary" />
        {pt("more.ops.title")}
      </h2>

      {failed && !loading ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-destructive-soft px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4" />
          {pt("more.ops.loadFailed")}
          <Button
            data-ai-section-type="button"
            variant="ghost"
            onClick={() => void load()}
          >
            <RefreshCcw className="size-3.5" />
            {pt("more.ops.retry")}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((index: number) => (
            <Card key={index}>
              <CardHeader className={headerClass}>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className={`${contentClass} space-y-2`}>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 卡住的记录 */}
          <Card>
            <CardHeader className={headerClass}>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TriangleAlert className="size-4 text-destructive" />
                {pt("more.ops.stuck")}
              </CardTitle>
            </CardHeader>
            <CardContent className={contentClass}>
              {data.stuck.length === 0 ? (
                <EmptyCell text={pt("more.empty")} />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th className={tableHeadCellClass}>
                        {pt("more.ops.col.file")}
                      </th>
                      <th className={tableHeadCellClass}>
                        {pt("more.ops.col.retry")}
                      </th>
                      <th className={tableHeadCellClass}>
                        {pt("more.ops.col.log")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stuck.map((item: OpsStuckItem) => (
                      <tr
                        key={item.id}
                        className="border-t border-border align-top"
                      >
                        <td className="max-w-[160px] break-words py-2 pr-2">
                          {item.originalFileName}
                        </td>
                        <td className="py-2 pr-2 font-mono">
                          {item.retryCount}
                        </td>
                        <td className="max-w-[180px] py-2 text-muted-foreground">
                          <span className="line-clamp-2">
                            {item.processLog ?? pt("more.empty")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* 待确认超期 */}
          <Card>
            <CardHeader className={headerClass}>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Timer className="size-4 text-warning-text" />
                {pt("more.ops.overdue")}
              </CardTitle>
            </CardHeader>
            <CardContent className={contentClass}>
              {data.overdueConfirm.length === 0 ? (
                <EmptyCell text={pt("more.empty")} />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th className={tableHeadCellClass}>
                        {pt("more.ops.col.file")}
                      </th>
                      <th className={tableHeadCellClass}>
                        {pt("more.ops.col.waitDays")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdueConfirm.map((item: OpsOverdueItem) => (
                      <tr
                        key={item.id}
                        className="border-t border-border align-top"
                      >
                        <td className="max-w-[200px] break-words py-2 pr-2">
                          {item.originalFileName}
                        </td>
                        <td className="py-2 font-mono font-semibold text-destructive">
                          {item.waitingDays} {pt("more.days")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* 群二维码临期告警 */}
          <Card className="md:col-span-2">
            <CardHeader className={headerClass}>
              <CardTitle className="flex items-center gap-2 text-sm">
                <QrCode className="size-4 text-primary" />
                {pt("more.ops.qrAlert")}
              </CardTitle>
            </CardHeader>
            <CardContent className={contentClass}>
              {data.qrAlert.status === "unavailable" ? (
                <EmptyCell text={pt("more.ops.qr.none")} />
              ) : data.qrAlert.status === "expired" ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
                  <TriangleAlert className="size-4 shrink-0" />
                  {pt("more.ops.qr.expired")}
                  {expiryText ? (
                    <span className="font-mono text-xs">
                      {pt("more.ops.qr.expiry")} {expiryText}
                    </span>
                  ) : null}
                </div>
              ) : data.qrAlert.status === "expiring" ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text">
                  <TriangleAlert className="size-4 shrink-0" />
                  {pt("more.ops.qr.expiring")}
                  {expiryText ? (
                    <span className="font-mono text-xs">
                      {pt("more.ops.qr.expiry")} {expiryText}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-success" />
                  {pt("more.ops.qr.ok")}
                  {expiryText ? (
                    <span className="font-mono text-xs">
                      {pt("more.ops.qr.expiry")} {expiryText}
                    </span>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 数据体检 */}
          <Card>
            <CardHeader className={headerClass}>
              <CardTitle className="flex items-center gap-2 text-sm">
                <HeartPulse className="size-4 text-primary" />
                {pt("more.ops.health")}
              </CardTitle>
            </CardHeader>
            <CardContent className={contentClass}>
              {data.health.length === 0 ? (
                <EmptyCell text={pt("more.empty")} />
              ) : (
                <table className="w-full text-xs">
                  <tbody>
                    {data.health.map((item: OpsHealthItem) => (
                      <tr
                        key={item.key}
                        className="border-t border-border first:border-t-0"
                      >
                        <td className="py-1.5 text-muted-foreground">
                          {pt(`more.ops.health.${item.key}`)}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {item.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* 同步延迟说明 */}
          <Card>
            <CardHeader className={headerClass}>
              <CardTitle className="flex items-center gap-2 text-sm">
                <RefreshCcw className="size-4 text-primary" />
                {pt("more.ops.sync")}
              </CardTitle>
            </CardHeader>
            <CardContent className={contentClass}>
              {settings ? (
                <p className="rounded-md bg-ai-quote px-3 py-2 text-sm leading-relaxed text-ai-quote-foreground">
                  {settings.syncDelayHint}
                </p>
              ) : (
                <Skeleton className="h-9 w-full" />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
};
