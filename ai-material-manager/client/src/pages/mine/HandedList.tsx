import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ChevronRight, FileClock } from "lucide-react";

import { logger } from "@client/src/lib/logger";
import type {
  MyHandledItem,
  MyHandledRole,
  MyHandledStage,
  PoolRecordItem,
  PoolRecordRole,
} from "@shared/api.interface";
import { getMyHandled } from "@client/src/api/my";
import { Badge } from "@client/src/components/ui/badge";
import ProgressTracker from "@client/src/components/ProgressTracker";
import { useI18n } from "@client/src/hooks/use-i18n";
import { makePt } from "./mine-i18n";
import { ListEmpty, ListError, ListSkeleton } from "./MineListPrimitives";

const STAGE_META: Record<MyHandledStage, { labelKey: string; className: string }> = {
  waitPublish: {
    labelKey: "mine.stage.waitPublish",
    className: "bg-warning-soft text-warning-text",
  },
  published: {
    labelKey: "mine.stage.published",
    className: "bg-success-foreground text-success",
  },
  offline: {
    labelKey: "mine.stage.offline",
    className: "bg-muted text-muted-foreground",
  },
};

const ROLE_LABEL_KEY: Record<MyHandledRole, string> = {
  planner: "mine.role.planner",
  designer: "mine.role.designer",
};

const POOL_ROLE_LABEL_KEY: Record<PoolRecordRole, string> = {
  uploader: "mine.pool.role.uploader",
  designer: "mine.pool.role.designer",
  planner: "mine.pool.role.planner",
};

/** 我经手的：池记录进度条（B-5） + 阶段标签 + 角色标注 */
const HandedList: React.FC = () => {
  const { language, t } = useI18n();
  const pt = makePt(language, t);
  const [items, setItems] = useState<MyHandledItem[] | null>(null);
  const [poolRecords, setPoolRecords] = useState<PoolRecordItem[]>([]);
  const [error, setError] = useState<boolean>(false);

  const load = useCallback(async (): Promise<void> => {
    setError(false);
    setItems(null);
    try {
      const response = await getMyHandled();
      setItems(response.items);
      setPoolRecords(response.poolRecords ?? []);
    } catch (err) {
      logger.error("加载我经手的列表失败", err);
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  if (items.length === 0 && poolRecords.length === 0) {
    return (
      <ListEmpty
        icon={Briefcase}
        title={pt("mine.empty.handled")}
        description={pt("mine.empty.handledDesc")}
      />
    );
  }

  return (
    <div className="space-y-2">
      {poolRecords.length > 0 ? (
        <div
          className="space-y-2 rounded-md border border-border bg-card p-4 shadow-sm"
          data-ai-section-type="pool-progress"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <FileClock className="size-3.5" />
            {pt("mine.pool.title")}
          </p>
          <div className="space-y-3">
            {poolRecords.map((record: PoolRecordItem) => (
              <div
                key={record.recordId}
                className="space-y-2 rounded-md border border-border bg-background/60 p-3"
              >
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {record.originalFileName || pt("mine.untitled")}
                  </p>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {pt(POOL_ROLE_LABEL_KEY[record.role])}
                  </Badge>
                </div>
                <ProgressTracker progress={record.progress} />
                {record.uploadTime ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    {record.uploadTime.slice(0, 10)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {items.map((item: MyHandledItem) => {
        const stage = STAGE_META[item.stage] ?? STAGE_META.published;
        return (
          <Link
            key={item.baseRecordId}
            to={`/material/${item.baseRecordId}`}
            className="flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm transition-shadow duration-[var(--duration-fast)] hover:shadow-md"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.materialName || pt("mine.untitled")}
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {item.baseRecordId}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              {pt(ROLE_LABEL_KEY[item.role])}
            </Badge>
            <Badge className={`shrink-0 gap-1 ${stage.className}`}>
              {pt(stage.labelKey)}
            </Badge>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
};

export default HandedList;
