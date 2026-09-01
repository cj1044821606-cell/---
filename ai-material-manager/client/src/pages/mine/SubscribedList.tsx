import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Package } from "lucide-react";

import { logger } from "@client/src/lib/logger";
import type { MySubscribedItem } from "@shared/api.interface";
import { getMySubscribed } from "@client/src/api/my";
import { Image } from "@client/src/components/ui/image";
import { useI18n } from "@client/src/hooks/use-i18n";
import { makePt } from "./mine-i18n";
import { ListEmpty, ListError, ListSkeleton } from "./MineListPrimitives";

/** 我订阅的：卡片列表，点击进入物料详情 */
const SubscribedList: React.FC = () => {
  const { language, t } = useI18n();
  const pt = makePt(language, t);
  const [items, setItems] = useState<MySubscribedItem[] | null>(null);
  const [error, setError] = useState<boolean>(false);

  const load = useCallback(async (): Promise<void> => {
    setError(false);
    setItems(null);
    try {
      const response = await getMySubscribed();
      setItems(response.items);
    } catch (err) {
      logger.error("加载我订阅的列表失败", err);
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

  if (items.length === 0) {
    return (
      <ListEmpty
        icon={Bell}
        title={pt("mine.empty.subscribed")}
        description={pt("mine.empty.subscribedDesc")}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item: MySubscribedItem) => (
        <Link
          key={item.baseRecordId}
          to={`/material/${item.baseRecordId}`}
          className="overflow-hidden rounded-md border border-border bg-card shadow-sm transition-shadow duration-[var(--duration-fast)] hover:shadow-md"
        >
          {item.previewUrl ? (
            <Image
              src={item.previewUrl}
              alt={item.materialName}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="h-28 w-full border-b border-border object-cover"
            />
          ) : (
            <div className="flex h-28 w-full items-center justify-center border-b border-border bg-gradient-to-br from-primary-soft to-primary-line">
              <Package className="size-5 text-primary" />
            </div>
          )}
          <div className="space-y-1 p-3">
            <p className="truncate font-mono text-sm font-semibold">
              {item.standardName || pt("mine.untitled")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {item.materialName}
            </p>
            {item.currentVersion ? (
              <p className="font-mono text-xs text-primary">
                {item.currentVersion}
              </p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default SubscribedList;
