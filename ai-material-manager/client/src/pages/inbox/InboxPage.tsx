import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, RefreshCw, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logger } from "@client/src/lib/logger";

import type { InboxCard, InboxResponse } from "@shared/inbox";
import { getInbox } from "@client/src/api/inbox";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@client/src/components/ui/alert";
import { Button } from "@client/src/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@client/src/components/ui/empty";
import { Skeleton } from "@client/src/components/ui/skeleton";
import { useI18n } from "@client/src/hooks/use-i18n";
import { useIdentity } from "@client/src/hooks/use-identity";
import PageHeader from "@client/src/components/PageHeader";
import { INBOX_I18N } from "./inbox-i18n";
import InboxCardItem from "./InboxCardItem";

/** 等待天数超过该阈值的卡片进入「等太久了」优先分组 */
const PRIORITY_WAITING_DAYS: number = 3;

const SKELETON_KEYS: number[] = [0, 1, 2, 3];

const InboxPage: React.FC = () => {
  const { language, t } = useI18n();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxCard[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const pt = (key: string): string => INBOX_I18N[key]?.[language] ?? t(key);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response: InboxResponse = await getInbox();
      setItems(response.items ?? []);
    } catch (err: unknown) {
      logger.error(
        `Failed to load inbox: ${
          err instanceof Error ? err.stack ?? err.message : String(err)
        }`,
      );
      setError(pt("inbox.error.load"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const sorted: InboxCard[] = [...(items ?? [])].sort(
      (a: InboxCard, b: InboxCard) => b.waitingDays - a.waitingDays,
    );
    const priority: InboxCard[] = sorted.filter(
      (card: InboxCard) => card.waitingDays > PRIORITY_WAITING_DAYS,
    );
    const normal: InboxCard[] = sorted.filter(
      (card: InboxCard) => card.waitingDays <= PRIORITY_WAITING_DAYS,
    );
    return { priority, normal };
  }, [items]);

  const total: number = items?.length ?? 0;

  return (
    <div>
      <PageHeader
        title={t("nav.inbox")}
        meta={loading && !error ? pt("common.loading") : pt("inbox.page.subtitle")}
        actions={
          identity?.isUploadRole ? (
            <Button onClick={() => navigate("/upload")}>
              <Upload className="size-4" />
              {t("nav.upload")}
            </Button>
          ) : null
        }
      />

      {error !== null ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{error}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-3.5" />
              {t("common.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {error === null && loading ? (
        <div className="space-y-2">
          {SKELETON_KEYS.map((index: number) => (
            <Skeleton key={index} className="h-[72px] w-full rounded-md" />
          ))}
        </div>
      ) : null}

      {error === null && !loading && total === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox className="size-5 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>{pt("inbox.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {pt("inbox.empty.description")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {error === null && !loading && total > 0 ? (
        <div className="space-y-6">
          {groups.priority.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                <h2 className="text-sm font-semibold text-foreground">
                  {pt("inbox.group.priority")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {groups.priority.length}
                </span>
              </div>
              <div className="space-y-2">
                {groups.priority.map((card: InboxCard) => (
                  <InboxCardItem
                    key={`${card.type}-${card.id}`}
                    card={card}
                    priority
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            {groups.priority.length > 0 ? (
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {pt("inbox.group.normal")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {groups.normal.length}
                </span>
              </div>
            ) : null}
            <div className="space-y-2">
              {groups.normal.map((card: InboxCard) => (
                <InboxCardItem
                  key={`${card.type}-${card.id}`}
                  card={card}
                  priority={false}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default InboxPage;
