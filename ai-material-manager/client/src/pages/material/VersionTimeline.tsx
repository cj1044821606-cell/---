import React, { useCallback, useMemo, useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";

import type { VersionItem } from "@shared/material";
import type { DeliverableFile } from "@shared/files";
import { getVersionFiles } from "@client/src/api/files";
import { Badge } from "@client/src/components/ui/badge";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";
import { formatDate } from "./material-detail-utils";
import MaterialFileList from "./MaterialFileList";

interface VersionTimelineProps {
  materialId: string;
  versions: VersionItem[];
  /** 服务端按身份表判定：只有设计师能下载历史版本 */
  canDownloadHistory: boolean;
}

type VersionFilesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; files: DeliverableFile[] };

const VersionTimeline: React.FC<VersionTimelineProps> = ({
  materialId,
  versions,
  canDownloadHistory,
}) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filesById, setFilesById] = useState<Record<string, VersionFilesState>>(
    {},
  );

  const sorted: VersionItem[] = useMemo(
    () =>
      [...versions].sort((a: VersionItem, b: VersionItem) =>
        (b.publishTime ?? "").localeCompare(a.publishTime ?? ""),
      ),
    [versions],
  );

  const toggleVersion = useCallback(
    (versionId: string) => {
      if (openId === versionId) {
        setOpenId(null);
        return;
      }
      setOpenId(versionId);
      const cached = filesById[versionId];
      if (cached && cached.status !== "error") return;
      setFilesById((prev) => ({ ...prev, [versionId]: { status: "loading" } }));
      getVersionFiles(materialId, versionId)
        .then((data) =>
          setFilesById((prev) => ({
            ...prev,
            [versionId]: { status: "ready", files: data.files },
          })),
        )
        .catch(() =>
          setFilesById((prev) => ({ ...prev, [versionId]: { status: "error" } })),
        );
    },
    [filesById, materialId, openId],
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
          {sorted.map((version: VersionItem) => {
            const isOpen: boolean = openId === version.baseRecordId;
            const state: VersionFilesState | undefined =
              filesById[version.baseRecordId];
            const showDownload: boolean =
              canDownloadHistory &&
              !version.isCurrentValid &&
              version.baseRecordId.length > 0;
            return (
              <li
                key={version.baseRecordId}
                className={`relative pb-4 transition-opacity duration-150 last:pb-0 ${
                  version.isCurrentValid || isOpen
                    ? ""
                    : "opacity-70 hover:opacity-100"
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
                {showDownload ? (
                  version.archivedFileCount > 0 ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleVersion(version.baseRecordId)}
                        className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {isOpen ? (
                          <ChevronDown className="size-3.5 rotate-180 transition-transform duration-150" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                        {isOpen
                          ? pt("timeline.hideVersionFiles")
                          : pt("timeline.downloadVersion")}
                        {!isOpen ? (
                          <span className="tabular-nums text-muted-foreground">
                            {version.archivedFileCount}
                          </span>
                        ) : null}
                      </button>
                      {isOpen ? (
                        <div className="mt-2 rounded-md border border-border bg-surface-sunken/40 p-3">
                          <p className="mb-3 text-xs leading-relaxed text-warning-text">
                            {pt("timeline.historyNote")}
                          </p>
                          {!state || state.status === "loading" ? (
                            <div className="flex justify-center py-3">
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : state.status === "error" ? (
                            <p className="text-xs text-danger-text">
                              {pt("timeline.loadFailed")}
                            </p>
                          ) : (
                            <MaterialFileList
                              files={state.files}
                              language={language}
                            />
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {pt("timeline.noArchive")}
                    </p>
                  )
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default VersionTimeline;
