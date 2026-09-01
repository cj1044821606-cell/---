import React, { useMemo } from "react";

import type { VersionItem } from "@shared/material";
import { Badge } from "@client/src/components/ui/badge";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";
import { formatDate } from "./material-detail-utils";

interface VersionTimelineProps {
  versions: VersionItem[];
}

const VersionTimeline: React.FC<VersionTimelineProps> = ({ versions }) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);

  const sorted: VersionItem[] = useMemo(
    () =>
      [...versions].sort((a: VersionItem, b: VersionItem) =>
        (b.publishTime ?? "").localeCompare(a.publishTime ?? ""),
      ),
    [versions],
  );

  if (sorted.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {pt("timeline.title")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {pt("timeline.count", { n: sorted.length })}
        </span>
      </div>
      <div className="relative pl-[22px]">
        <span
          aria-hidden
          className="absolute bottom-1 left-[5px] top-1 w-0.5 bg-border"
        />
        <ol>
          {sorted.map((version: VersionItem) => (
            <li
              key={version.baseRecordId}
              className={`relative pb-4 transition-opacity duration-150 last:pb-0 ${
                version.isCurrentValid ? "" : "opacity-70 hover:opacity-100"
              }`}
            >
              <span
                aria-hidden
                className={`absolute -left-[22px] top-1 size-3 rounded-full ${
                  version.isCurrentValid
                    ? "bg-success ring-4 ring-success-soft"
                    : "border-2 border-border-strong bg-card"
                }`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`font-mono ${
                    version.isCurrentValid
                      ? "text-[15px] font-bold text-foreground"
                      : "text-sm font-semibold text-muted-foreground"
                  }`}
                >
                  {version.versionNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  {version.versionType}
                </span>
                {version.isCurrentValid ? (
                  <Badge className="bg-success-soft text-success-text">
                    {pt("timeline.current")}
                  </Badge>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDate(version.publishTime)}
                </span>
              </div>
              {version.modifyReason ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {version.modifyReason}
                </p>
              ) : null}
              {version.receivedByMeAt ? (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-medium text-info-text">
                  {pt("timeline.receivedAt", {
                    date: formatDate(version.receivedByMeAt),
                  })}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default VersionTimeline;
