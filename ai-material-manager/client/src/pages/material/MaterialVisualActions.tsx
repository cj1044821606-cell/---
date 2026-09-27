import React, { useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import type { MaterialDetail } from "@shared/material";
import type { DeliverableFile } from "@shared/files";
import FallbackImage from "@client/src/components/FallbackImage";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";
import { getMaterialFiles } from "@client/src/api/files";
import { getTypeArt } from "./material-detail-utils";
import MaterialFileList from "./MaterialFileList";

interface MaterialVisualActionsProps {
  material: MaterialDetail;
  roles: string[];
}

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
          <MaterialFileList files={visibleFiles} language={language} />
        ) : (
          <p className="text-xs text-muted-foreground">{pt("files.empty")}</p>
        )}
      </section>
    </div>
  );
};

export default MaterialVisualActions;
