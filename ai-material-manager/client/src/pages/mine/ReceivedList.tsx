import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, Download, LoaderCircle } from "lucide-react";
import dayjs from "dayjs";

import { logger } from "@client/src/lib/logger";
import type { MyReceivedItem } from "@shared/api.interface";
import { getMyReceived } from "@client/src/api/my";
import { Badge } from "@client/src/components/ui/badge";
import { useI18n } from "@client/src/hooks/use-i18n";
import {
  clearPendingReceives,
  listPendingReceives,
  type PendingReceive,
} from "@client/src/utils/pending-receives";
import { makePt } from "./mine-i18n";
import { ListEmpty, ListError, ListSkeleton } from "./MineListPrimitives";

const CARD_CLASS =
  "flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm transition-shadow duration-[var(--duration-fast)]";

/** 我领过的：本地「同步中」占位置顶 + 服务端列表合并 */
const ReceivedList: React.FC = () => {
  const { language, t } = useI18n();
  const pt = makePt(language, t);
  const [items, setItems] = useState<MyReceivedItem[] | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingReceive[]>(() =>
    listPendingReceives(),
  );

  const load = useCallback(async (): Promise<void> => {
    setError(false);
    setItems(null);
    try {
      const response = await getMyReceived();
      setItems(response.items);
    } catch (err) {
      logger.error("加载我领过的列表失败", err);
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 真实数据中 materialBaseRecordId 命中的本地占位说明已同步完成，清理
  useEffect(() => {
    if (!items) return;
    const syncedIds: Set<string> = new Set(
      items
        .map((item: MyReceivedItem) => item.materialBaseRecordId)
        .filter((id: string | null): id is string => id !== null),
    );
    const matched: string[] = pending
      .filter((entry: PendingReceive) => syncedIds.has(entry.materialId))
      .map((entry: PendingReceive) => entry.materialId);
    if (matched.length > 0) {
      clearPendingReceives(matched);
      setPending(
        (prev: PendingReceive[]) =>
          prev.filter((entry: PendingReceive) => !matched.includes(entry.materialId)),
      );
    }
  }, [items, pending]);

  if (error) {
    return (
      <ListError
        message={pt("mine.error")}
        retryLabel={pt("mine.retry")}
        onRetry={() => void load()}
      />
    );
  }

  if (!items) {
    return <ListSkeleton />;
  }

  if (pending.length === 0 && items.length === 0) {
    return (
      <ListEmpty
        icon={Download}
        title={pt("mine.empty.received")}
        description={pt("mine.empty.receivedDesc")}
      />
    );
  }

  return (
    <div className="space-y-2">
      {pending.map((entry: PendingReceive) => (
        <div key={entry.materialId} className={`${CARD_CLASS} border-dashed`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {entry.materialName || pt("mine.untitled")}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {entry.versionNo ?? pt("mine.noVersion")}
              </span>
              {entry.receivedAt ? (
                <span className="font-mono">
                  {dayjs(entry.receivedAt).format("YYYY-MM-DD HH:mm")}
                </span>
              ) : null}
            </p>
          </div>
          <Badge className="gap-1 bg-primary-soft text-primary">
            <LoaderCircle className="size-3 animate-spin" />
            {pt("mine.syncing")}
          </Badge>
        </div>
      ))}

      {items.map((item: MyReceivedItem) => {
        const body = (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.materialName ?? pt("mine.untitled")}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">
                  {item.versionNo ?? pt("mine.noVersion")}
                </span>
                {item.downloadTime ? (
                  <span className="font-mono">
                    {dayjs(item.downloadTime).format("YYYY-MM-DD HH:mm")}
                  </span>
                ) : null}
              </p>
            </div>
            {item.isReplacedNewVersion ? (
              <Badge className="gap-1 bg-destructive-soft text-destructive">
                <AlertTriangle className="size-3" />
                {pt("mine.expired")}
              </Badge>
            ) : null}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </>
        );

        if (!item.materialBaseRecordId) {
          return (
            <div key={item.id} className={CARD_CLASS}>
              {body}
            </div>
          );
        }
        return (
          <Link
            key={item.id}
            to={`/material/${item.materialBaseRecordId}`}
            className={`${CARD_CLASS} hover:shadow-md`}
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
};

export default ReceivedList;
