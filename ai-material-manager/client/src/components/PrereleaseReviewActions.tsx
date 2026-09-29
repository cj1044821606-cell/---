import React, { useState } from "react";
import axios from "axios";
import { ArrowLeft, BadgeCheck, Check, Loader, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { approvePrerelease, rejectPrerelease } from "@client/src/api/prerelease";
import { Button } from "@client/src/components/ui/button";
import { Textarea } from "@client/src/components/ui/textarea";
import { useI18n } from "@client/src/hooks/use-i18n";
import type { Language } from "@client/src/i18n/dictionary";

const REASON_MAX_LENGTH = 2000;

const TEXT: Record<string, Record<Language, string>> = {
  approve: { zh: "审核通过，转正式发布", en: "Approve & make official" },
  reject: { zh: "驳回", en: "Reject" },
  rejectHint: {
    zh: "驳回后该版本会下架；若它替换了旧版，旧版已下架，物料会暂时没有可用版本，直到上传者修改后重新发布。",
    en: "Rejecting takes this version offline. If it replaced an older version, that one is already offline, so the material has no available version until the uploader republishes.",
  },
  reasonPlaceholder: {
    zh: "写明驳回原因，上传者会在待办里看到",
    en: "Explain why — the uploader sees this in their to-dos",
  },
  back: { zh: "返回", en: "Back" },
  confirmReject: { zh: "确认驳回并下架", en: "Reject and take offline" },
  approved: { zh: "已审核通过，现为正式发布", en: "Approved — now officially released" },
  rejected: { zh: "已驳回并下架，上传者会收到原因", en: "Rejected and taken offline" },
  failed: { zh: "操作失败，请重试", en: "Action failed, please retry" },
  tooLong: { zh: "原因太长了（最多 2000 字）", en: "Reason too long (max 2000)" },
};

function serverMessage(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.error?.message;
    if (typeof message === "string" && message) return message;
  }
  return null;
}

interface PrereleaseReviewActionsProps {
  materialId: string;
  /** 审核完成后回调（刷新详情/待办） */
  onDone?: (result: "approved" | "rejected") => void;
}

/** 策划人及审核人的审核按钮：通过 / 驳回（驳回需写原因） */
const PrereleaseReviewActions: React.FC<PrereleaseReviewActionsProps> = ({
  materialId,
  onDone,
}) => {
  const { language } = useI18n();
  const tx = (key: string): string => TEXT[key]?.[language] ?? key;

  const [rejectMode, setRejectMode] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  const run = async (action: "approve" | "reject"): Promise<void> => {
    const value = reason.trim();
    if (action === "reject" && value.length === 0) return;
    if (value.length > REASON_MAX_LENGTH) {
      toast.error(tx("tooLong"));
      return;
    }
    setSubmitting(action);
    try {
      const resp =
        action === "approve"
          ? await approvePrerelease(materialId)
          : await rejectPrerelease(materialId, value);
      setDone(resp.result);
      onDone?.(resp.result);
    } catch (error) {
      toast.error(serverMessage(error) ?? tx("failed"));
    } finally {
      setSubmitting(null);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2.5 text-sm text-success">
        {done === "approved" ? (
          <BadgeCheck className="size-4 shrink-0" />
        ) : (
          <Check className="size-4 shrink-0" />
        )}
        {tx(done)}
      </div>
    );
  }

  if (rejectMode) {
    return (
      <div className="space-y-2">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {tx("rejectHint")}
        </p>
        <Textarea
          value={reason}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setReason(event.target.value)
          }
          placeholder={tx("reasonPlaceholder")}
          rows={3}
          disabled={submitting !== null}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRejectMode(false)}
            disabled={submitting !== null}
          >
            <ArrowLeft className="size-3.5" />
            {tx("back")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => void run("reject")}
            disabled={submitting !== null || reason.trim().length === 0}
          >
            {submitting === "reject" ? (
              <Loader className="size-3.5 animate-spin" />
            ) : null}
            {tx("confirmReject")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() => void run("approve")}
        disabled={submitting !== null}
      >
        {submitting === "approve" ? (
          <Loader className="size-3.5 animate-spin" />
        ) : (
          <BadgeCheck className="size-3.5" />
        )}
        {tx("approve")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive"
        onClick={() => setRejectMode(true)}
        disabled={submitting !== null}
      >
        <Undo2 className="size-3.5" />
        {tx("reject")}
      </Button>
    </div>
  );
};

export default PrereleaseReviewActions;
