import React from "react";
import { CheckCircle2, QrCode } from "lucide-react";

import { Button } from "@client/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { Image } from "@client/src/components/ui/image";
import { useI18n } from "@client/src/hooks/use-i18n";
import type { SystemSettings } from "@shared/api.interface";

const GROUP_JOINED_KEY = "app.group-joined";

export function hasJoinedGroup(): boolean {
  try {
    return window.localStorage.getItem(GROUP_JOINED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markGroupJoined(): void {
  try {
    window.localStorage.setItem(GROUP_JOINED_KEY, "1");
  } catch {
    // localStorage 不可用时仅本次会话生效
  }
}

export interface GroupGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: SystemSettings | null;
}

const GUIDE_STEPS: string[] = [
  "groupGuide.step1",
  "groupGuide.step2",
  "groupGuide.step3",
];

const GroupGuideDialog: React.FC<GroupGuideDialogProps> = ({
  open,
  onOpenChange,
  settings,
}) => {
  const { t } = useI18n();
  const qrAvailable =
    Boolean(settings?.groupQrUrl) &&
    (settings?.groupQrStatus === "available" ||
      settings?.groupQrStatus === "expiring");

  const handleConfirm = (): void => {
    if (!qrAvailable) return;
    markGroupJoined();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-primary" />
            {t("groupGuide.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="rounded-md bg-ai-quote px-3 py-2 leading-relaxed text-ai-quote-foreground">
            {t("groupGuide.why")}
          </p>

          <div className="flex justify-center py-1">
            {settings?.groupQrUrl ? (
              <Image
                src={settings.groupQrUrl}
                alt={t("groupGuide.title")}
                width={180}
                className="rounded-md border border-border"
              />
            ) : (
              <div className="flex h-[180px] w-[180px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
                <QrCode className="size-8 text-muted-foreground/60" />
                {t(
                  settings?.groupQrStatus === "expired"
                    ? "groupGuide.qrExpired"
                    : "groupGuide.qrFallback",
                )}
              </div>
            )}
          </div>

          {qrAvailable ? (
            <ol className="space-y-1.5">
              {GUIDE_STEPS.map((stepKey: string, index: number) => (
                <li key={stepKey} className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{t(stepKey)}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="rounded-md bg-warning-soft px-3 py-2 text-sm leading-relaxed text-warning-text">
            {t("groupGuide.fileReminder")}
          </p>

          <Button className="w-full" onClick={handleConfirm} disabled={!qrAvailable}>
            <CheckCircle2 className="size-4" />
            {t(qrAvailable ? "groupGuide.confirm" : "groupGuide.unavailable")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupGuideDialog;
