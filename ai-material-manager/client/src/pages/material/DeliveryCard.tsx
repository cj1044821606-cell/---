import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { Button } from "@client/src/components/ui/button";
import {
  Download,
  ExternalLink,
  Check,
  FileText,
  Image,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { DeliverableFile, MaterialFilesResponse } from "@shared/files";
import { triggerDownload } from "@client/src/utils/download";

interface DeliveryCardProps {
  open: boolean;
  onClose: () => void;
  materialName: string;
  versionNumber: string;
  materialId: string;
  sourceFileVisible: boolean;
}

const TIER_LABELS: Record<string, string> = {
  M: "导出件 M",
  L: "源文件 L",
  S: "预览 S",
};

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  open,
  onClose,
  materialName,
  versionNumber,
  materialId,
  sourceFileVisible,
}) => {
  const [files, setFiles] = useState<MaterialFilesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoDownloaded, setAutoDownloaded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLoading(true);
    import("@client/src/api/files")
      .then((m) => m.getMaterialFiles(materialId))
      .then((data: MaterialFilesResponse) => {
        setFiles(data);
        setLoading(false);
        // 自动触发 M 档第一个文件的下载
        const mFiles: DeliverableFile[] = data.files.filter(
          (f: DeliverableFile) => f.kind === "M",
        );
        if (mFiles.length > 0) {
          handleDownload(mFiles[0]);
          setAutoDownloaded(mFiles[0].fileName);
        }
      })
      .catch(() => {
        setLoading(false);
        toast.error("获取文件列表失败");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, materialId]);

  const handleDownload = (file: DeliverableFile): void => {
    if (file.delivery === "external") {
      window.open(file.url, "_blank", "noopener");
    } else {
      triggerDownload(file.url, file.fileName);
    }
  };

  const groupByKind = (
    list: DeliverableFile[],
  ): Record<string, DeliverableFile[]> => {
    const groups: Record<string, DeliverableFile[]> = {};
    for (const f of list) {
      (groups[f.kind] ??= []).push(f);
    }
    return groups;
  };

  if (!open) {
    return null;
  }

  const renderFileRow = (
    file: DeliverableFile,
    index: number,
  ): React.ReactNode => {
    const isDownloaded: boolean = autoDownloaded === file.fileName;
    const icon: React.ReactNode = file.mimeType?.startsWith("image/") ? (
      <Image className="size-4" />
    ) : (
      <FileText className="size-4" />
    );

    return (
      <div
        key={index}
        className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {icon}
          <span className="truncate text-sm">{file.fileName}</span>
          {isDownloaded ? (
            <span className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3 text-green-500" />
              已开始下载
            </span>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDownload(file)}
          className="ml-2 flex-shrink-0"
        >
          {file.delivery === "external" ? (
            <ExternalLink className="size-4" />
          ) : (
            <Download className="size-4" />
          )}
        </Button>
      </div>
    );
  };

  const groups: Record<string, DeliverableFile[]> = files
    ? groupByKind(files.files)
    : {};

  return (
    <Dialog
      open={open}
      onOpenChange={(v: boolean) => {
        if (!v) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Check className="size-4 text-green-500" />
            已记录你的提取
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {materialName} · {versionNumber}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : files ? (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {(["M", "L", "S"] as const).map((kind: "M" | "L" | "S") => {
              const tierFiles: DeliverableFile[] = groups[kind] ?? [];
              const missing: string | undefined = files.missing?.[kind];
              if (tierFiles.length === 0 && !missing) {
                return null;
              }
              if (kind === "L" && !sourceFileVisible) {
                return null;
              }

              return (
                <div key={kind}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {TIER_LABELS[kind]}
                    </span>
                    {kind === "L" && sourceFileVisible ? (
                      <span className="text-xs text-muted-foreground">
                        仅设计/策划可见
                      </span>
                    ) : null}
                  </div>
                  {tierFiles.length > 0 ? (
                    <div className="space-y-1.5">
                      {tierFiles.map((f: DeliverableFile, i: number) =>
                        renderFileRow(f, i),
                      )}
                    </div>
                  ) : missing ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground opacity-60">
                      {missing}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryCard;