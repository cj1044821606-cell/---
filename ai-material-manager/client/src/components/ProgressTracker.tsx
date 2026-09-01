import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import type { PoolProgress, PoolStage } from "@shared/pool";
import { useI18n } from "@client/src/hooks/use-i18n";
import { PROGRESS_I18N } from "./progress-i18n";

interface ProgressTrackerProps {
  progress: PoolProgress;
}

/** 六节点主线：①已提交 ②AI识别中 ③等你补充 ④等你确认 ⑤已入库 ⑥已发布 */
const STEP_ORDER: PoolStage[] = [
  "submitted",
  "recognizing",
  "needInfo",
  "needConfirm",
  "stored",
  "published",
];

const STAGE_LABEL_KEYS: Record<PoolStage, string> = {
  submitted: "progress.submitted",
  recognizing: "progress.recognizing",
  needInfo: "progress.needInfo",
  needConfirm: "progress.needConfirm",
  stored: "progress.stored",
  published: "progress.published",
  rejected: "progress.rejected",
  stuck: "progress.stuck",
};

/** B-5 全流程进度条：主线节点 + 退回/卡住红色分支 */
const ProgressTracker: React.FC<ProgressTrackerProps> = ({ progress }) => {
  const { language, t } = useI18n();
  const pt = (key: string): string =>
    PROGRESS_I18N[key]?.[language] ?? t(key);

  if (progress.stage === "rejected" || progress.stage === "stuck") {
    const isRejected: boolean = progress.stage === "rejected";
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
          {isRejected ? (
            <RotateCcw className="size-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="size-3.5 shrink-0" />
          )}
          {pt(isRejected ? "progress.rejected" : "progress.stuck")}
        </p>
        {progress.rejectReason ? (
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/80">
            {progress.rejectReason}
          </p>
        ) : null}
      </div>
    );
  }

  const current: number = STEP_ORDER.indexOf(progress.stage);

  return (
    <div className="flex items-start">
      {STEP_ORDER.map((stage: PoolStage, index: number) => {
        const done: boolean = index < current;
        const isCurrent: boolean = index === current;
        const waiting: boolean =
          isCurrent && (stage === "needInfo" || stage === "needConfirm");
        const dotClass: string = done
          ? "border-primary bg-primary text-primary-foreground"
          : isCurrent
            ? waiting
              ? "border-warning-text bg-warning-soft text-warning-text"
              : "animate-pulse border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground";
        return (
          <div
            key={stage}
            className="relative flex min-w-0 flex-1 flex-col items-center"
          >
            {index > 0 ? (
              <span
                className={`absolute right-1/2 top-2.5 h-px w-full ${
                  index <= current ? "bg-primary" : "bg-border"
                }`}
              />
            ) : null}
            <span
              className={`relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${dotClass}`}
            >
              {index + 1}
            </span>
            <span
              className={`mt-1 w-full truncate text-center text-xs ${
                isCurrent
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {pt(STAGE_LABEL_KEYS[stage])}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ProgressTracker;
