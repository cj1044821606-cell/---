import React, { useMemo } from "react";
import { AlertTriangle, Inbox, RefreshCw, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { InboxCard } from "@shared/inbox";
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
import { useInbox } from "@client/src/inbox/inbox-provider";
import PageHeader from "@client/src/components/PageHeader";
import { INBOX_I18N } from "./inbox-i18n";
import InboxCardItem from "./InboxCardItem";

/** 等待天数超过该阈值的卡片进入「等太久了」优先分组 */
const PRIORITY_WAITING_DAYS: number = 3;

const SKELETON_KEYS: number[] = [0, 1, 2, 3];

const InboxPage: React.FC = () => {
  const { language, t } = useI18n();
  const { identity } = useIdentity();
  const { items, loading, refreshing, error, refresh } = useInbox();
  const navigate = useNavigate();

  const pt = (key: string): string => INBOX_I18N[key]?.[language] ?? t(key);

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
        meta={
          loading && items === null
            ? pt("common.loading")
            : refreshing
              ? pt("inbox.action.refreshing")
              : pt("inbox.page.subtitle")
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={pt("inbox.action.refresh")}
              title={pt("inbox.action.refresh")}
              disabled={loading || refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
            {identity?.isUploadRole ? (
              <Button onClick={() => navigate("/upload")}>
                <Upload className="size-4" />
                {t("nav.upload")}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{pt("inbox.error.load")}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              <RefreshCw className="size-3.5" />
              {t("common.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loading && items === null ? (
        <div className="space-y-2">
          {SKELETON_KEYS.map((index: number) => (
            <Skeleton key={index} className="h-[72px] w-full rounded-md" />
          ))}
        </div>
      ) : null}

      {!loading && items !== null && total === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox className="size-5 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>{pt("inbox.empty.title")}</EmptyTitle>
            <EmptyDescription>{pt("inbox.empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {items !== null && total > 0 ? (
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
