import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  Palette,
} from "lucide-react";

import type { MaterialDetail, VersionItem } from "@shared/material";
import type { MaterialStatusLabel } from "@shared/status";
import type { SystemSettings } from "@shared/settings";
import type { DeliverableFile } from "@shared/files";
import FallbackImage from "@client/src/components/FallbackImage";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";
import { getMaterialFiles } from "@client/src/api/files";
import { triggerDownload } from "@client/src/utils/download";
import { getTypeArt } from "./material-detail-utils";

interface MaterialVisualActionsProps {
  material: MaterialDetail;
  roles: string[];
}

const FILE_KIND_ICONS: Record<
  DeliverableFile["kind"],
  React.ComponentType<{ size?: number; className?: string }>
> = {
  M: FileText,
  L: Palette,
  S: Eye,
};

const TIER_LABELS: Record<string, string> = {
  M: "导出件 M",
  L: "源文件 L",
  S: "预览 S",
};

const SOURCE_FILE_ROLES: string[] = ["设计师", "策划", "维护者"];

const MaterialVisualActions: React.FC<MaterialVisualActionsProps> = ({
  material,
  roles,
}) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);

  const [files, setFiles] = useState<DeliverableFile[] | null>(null);
  const [filesLoading, setFilesLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled: boolean = false;
    setFilesLoading(true);
    getMaterialFiles(material.baseRecordId)
      .then((data) => {
        if (!cancelled) {
          setFiles(data.files);
          setFilesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [material.baseRecordId]);

  const canSeeSource: boolean = roles.some((role: string) =>
    SOURCE_FILE_ROLES.includes(role),
  );

  const visibleFiles: DeliverableFile[] = useMemo(() => {
    if (!files) {
      return [];
    }
    return files.filter((f: DeliverableFile) => {
      if (f.kind === "L" && !canSeeSource) {
        return false;
      }
      return true;
    });
  }, [files, canSeeSource]);

  const art = getTypeArt(material.materialType);
  const coverPlaceholder = (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${art.from}, ${art.to})` }}
    >
      <FileText className="size-8 text-white/70" />
    </div>
  );

  return (
    <div className="space-y-3" data-ai-section-type="material-visual">
      {/* A-4：object-contain 完整显示方版/竖版物料 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-sunken">
        {/* 详情大图用 1200px 缩略图，原图只在下载时拉取；失败依次降级 */}
        <FallbackImage
          sources={
            material.thumbLargeUrl || material.previewUrl || material.coverUrl
              ? [
                  material.thumbLargeUrl,
                  material.previewUrl,
                  material.coverUrl,
                  `/api/materials/${material.baseRecordId}/thumbnail`,
                ]
              : []
          }
          alt={material.materialName}
          priority
          skeletonClassName="inset-8"
          className="absolute inset-8 rounded-md object-contain shadow-[0_0_0_1px_rgba(16_24_40_0.07)]"
          style={{
            width: 'calc(100% - 4rem)',
            height: 'calc(100% - 4rem)',
          }}
          placeholder={coverPlaceholder}
        />
      </div>

      {/* A-2：M/L/S 三种文件形态，通过 files API 获取 */}
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          {pt("files.title")}
        </p>
        {material.isLargeFile ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText size={13} className="shrink-0" />
            {pt("files.largeFileNote")}
          </p>
        ) : null}
        {filesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : visibleFiles.length > 0 ? (
          <div className="space-y-1">
            {visibleFiles.map((file: DeliverableFile, index: number) => {
              const KindIcon = FILE_KIND_ICONS[file.kind];
              const handleClick = (): void => {
                if (file.delivery === "external") {
                  window.open(file.url, "_blank", "noopener");
                } else {
                  triggerDownload(file.url, file.fileName);
                }
              };
              return (
                <button
                  key={`${file.kind}-${index}`}
                  onClick={handleClick}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <KindIcon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {TIER_LABELS[file.kind]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {file.fileName}
                    </p>
                  </div>
                  {file.delivery === "external" ? (
                    <ExternalLink
                      size={15}
                      className="shrink-0 text-muted-foreground"
                    />
                  ) : file.kind === "S" ? (
                    <Eye
                      size={15}
                      className="shrink-0 text-muted-foreground"
                    />
                  ) : (
                    <Download
                      size={15}
                      className="shrink-0 text-muted-foreground"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{pt("files.empty")}</p>
        )}
      </section>
    </div>
  );
};

export default MaterialVisualActions;
