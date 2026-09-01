import React, { useState } from "react";
import { ArrowLeft, BadgeCheck, Check, Loader, Send } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@client/src/lib/logger";

import type { InboxCardType } from "@shared/inbox";
import type { PoolConfirmAction } from "@shared/pool";
import { poolApi } from "@client/src/api";
import { Button } from "@client/src/components/ui/button";
import { Textarea } from "@client/src/components/ui/textarea";
import { useI18n } from "@client/src/hooks/use-i18n";
import { INBOX_I18N } from "./inbox-i18n";

const REPLY_MAX_LENGTH = 2000;

interface InboxCardActionsProps {
  type: InboxCardType;
  recordId: string;
}

/**
 * B-3/B-4 就地操作区：
 * - aiAsk：追问就地回答（三字段由服务端同写）
 * - confirmRecognize：确认卡三按钮（通过并发布 / 仅入库 / 退回修改）
 */
const InboxCardActions: React.FC<InboxCardActionsProps> = ({
  type,
  recordId,
}) => {
  const { language } = useI18n();
  const pt = (key: string): string =>
    INBOX_I18N[key]?.[language] ?? key;

  const [reply, setReply] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [rejectMode, setRejectMode] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<PoolConfirmAction | "reply" | null>(null);
  const [done, setDone] = useState<PoolConfirmAction | "reply" | null>(null);

  const fail = (error: unknown): void => {
    logger.error("Pool action failed", {
      type,
      recordId,
      error: error instanceof Error ? error.message : String(error),
    });
    toast.error(pt("inbox.action.failed"));
  };

  const submitReply = async (): Promise<void> => {
    const value: string = reply.trim();
    if (value.length === 0) {
      return;
    }
    if (value.length > REPLY_MAX_LENGTH) {
      toast.error(pt("inbox.action.replyTooLong"));
      return;
    }
    setSubmitting("reply");
    try {
      await poolApi.replyPoolRecord(recordId, value);
      setDone("reply");
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(null);
    }
  };

  const submitConfirm = async (action: PoolConfirmAction): Promise<void> => {
    if (action === "reject" && !rejectMode) {
      setRejectMode(true);
      return;
    }
    const reasonValue: string = reason.trim();
    if (action === "reject" && reasonValue.length === 0) {
      return;
    }
    setSubmitting(action);
    try {
      await poolApi.confirmPoolRecord(
        recordId,
        action,
        action === "reject" ? reasonValue : undefined,
      );
      setDone(action);
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(null);
    }
  };

  if (done === "reply") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2.5 text-sm text-success">
        <Check className="size-4 shrink-0" />
        {pt("inbox.action.replyDone")}
      </div>
    );
  }

  if (done === "publish" || done === "store" || done === "reject") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2.5 text-sm text-success">
        <BadgeCheck className="size-4 shrink-0" />
        {pt(`inbox.action.done.${done}`)}
      </div>
    );
  }

  if (type === "aiAsk") {
    return (
      <div className="space-y-2">
        <Textarea
          value={reply}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setReply(event.target.value)
          }
          placeholder={pt("inbox.action.replyPlaceholder")}
          rows={3}
          disabled={submitting === "reply"}
        />
        <Button
          size="sm"
          onClick={submitReply}
          disabled={submitting === "reply" || reply.trim().length === 0}
        >
          {submitting === "reply" ? (
            <Loader className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
          {pt("inbox.action.replySubmit")}
        </Button>
      </div>
    );
  }

  if (rejectMode) {
    return (
      <div className="space-y-2">
        <Textarea
          value={reason}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setReason(event.target.value)
          }
          placeholder={pt("inbox.action.rejectPlaceholder")}
          rows={2}
          disabled={submitting === "reject"}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              setRejectMode(false);
            }}
            variant="ghost"
            disabled={submitting === "reject"}
          >
            <ArrowLeft className="size-3.5" />
            {pt("inbox.action.back")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void submitConfirm("reject");
            }}
            disabled={submitting === "reject" || reason.trim().length === 0}
          >
            {submitting === "reject" ? (
              <Loader className="size-3.5 animate-spin" />
            ) : null}
            {pt("inbox.action.confirmReject")}
          </Button>
        </div>
      </div>
    );
  }

  const buttons: Array<{
    action: PoolConfirmAction;
    labelKey: string;
    variant: "default" | "outline";
    danger: boolean;
  }> = [
    {
      action: "publish",
      labelKey: "inbox.action.publish",
      variant: "default",
      danger: false,
    },
    {
      action: "store",
      labelKey: "inbox.action.store",
      variant: "outline",
      danger: false,
    },
    {
      action: "reject",
      labelKey: "inbox.action.reject",
      variant: "outline",
      danger: true,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((button) => (
        <Button
          key={button.action}
          size="sm"
          variant={button.variant}
          disabled={submitting !== null}
          onClick={() => {
            void submitConfirm(button.action);
          }}
          className={button.danger ? "text-destructive" : undefined}
        >
          {submitting === button.action ? (
            <Loader className="size-3.5 animate-spin" />
          ) : null}
          {pt(button.labelKey)}
        </Button>
      ))}
    </div>
  );
};

export default InboxCardActions;
