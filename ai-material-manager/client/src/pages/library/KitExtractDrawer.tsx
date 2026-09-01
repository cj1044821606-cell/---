import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@client/src/components/ui/button";
import { Checkbox } from "@client/src/components/ui/checkbox";
import { Download, ExternalLink, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { DeliverableFile, KitFilesResponse } from "@shared/files";
import { getKitFiles } from "@client/src/api/files";
import { triggerDownload } from "@client/src/utils/download";
import { axiosForBackend } from "@client/src/lib/api-client";

interface KitExtractDrawerProps {
  open: boolean;
  onClose: () => void;
  productModel: string;
  materialIds: string[];
}

interface SelectedFile {
  materialId: string;
  file: DeliverableFile;
}

export const KitExtractDrawer: React.FC<KitExtractDrawerProps> = ({
  open,
  onClose,
  productModel,
  materialIds,
}: KitExtractDrawerProps) => {
  const [data, setData] = useState<KitFilesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getKitFiles(productModel)
      .then((d: KitFilesResponse) => {
        setData(d);
        setLoading(false);
        // 默认全选所有 M 档文件
        const allM: SelectedFile[] = [];
        for (const m of d.materials) {
          for (const f of m.files) {
            if (f.kind === "M") {
              allM.push({ materialId: m.materialId, file: f });
            }
          }
        }
        setSelectedFiles(allM);
      })
      .catch(() => {
        setLoading(false);
        toast.error("获取文件列表失败");
      });
  }, [open, productModel]);

  const isSelected = (
    materialId: string,
    file: DeliverableFile,
  ): boolean =>
    selectedFiles.some(
      (s: SelectedFile) =>
        s.materialId === materialId && s.file.fileName === file.fileName,
    );

  const toggleFile = (materialId: string, file: DeliverableFile): void => {
    setSelectedFiles((prev: SelectedFile[]): SelectedFile[] => {
      const exists: boolean = prev.some(
        (s: SelectedFile) =>
          s.materialId === materialId && s.file.fileName === file.fileName,
      );
      if (exists) {
        return prev.filter(
          (s: SelectedFile) =>
            !(s.materialId === materialId && s.file.fileName === file.fileName),
        );
      }
      return [...prev, { materialId, file }];
    });
  };

  const totalFiles: number = useMemo(() => {
    if (!data) return 0;
    return data.materials.reduce(
      (sum: number, m) => sum + m.files.length,
      0,
    );
  }, [data]);

  const toggleAll = (): void => {
    if (!data) return;
    if (selectedFiles.length === totalFiles) {
      setSelectedFiles([]);
    } else {
      const all: SelectedFile[] = [];
      for (const m of data.materials) {
        for (const f of m.files) {
          all.push({ materialId: m.materialId, file: f });
        }
      }
      setSelectedFiles(all);
    }
  };

  const handleDownload = async (): Promise<void> => {
    if (selectedFiles.length === 0) return;
    if (selectedFiles.length > 10) {
      if (
        !window.confirm(`即将下载 ${selectedFiles.length} 个文件，是否继续？`)
      ) {
        return;
      }
    }
    setDownloading(true);
    try {
      for (let i: number = 0; i < selectedFiles.length; i++) {
        const { file } = selectedFiles[i];
        if (i > 0) {
          await new Promise<void>((r) => setTimeout(r, 300));
        }
        if (file.delivery === "external") {
          window.open(file.url, "_blank", "noopener");
        } else {
          triggerDownload(file.url, file.fileName);
        }
      }
      toast.success(`${selectedFiles.length} 个文件已开始下载`);
      // 并行记账，不阻塞
      void axiosForBackend
        .post("/api/actions/receive-batch", {
          materialIds: [...new Set(selectedFiles.map((s) => s.materialId))],
        })
        .catch(() => {});
    } catch {
      toast.error("下载过程中出现错误");
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card shadow-lg border-l border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronRight className="size-5" />
          </Button>
          <div>
            <h2 className="text-base font-semibold">
              {productModel} 资料包
            </h2>
            {data && (
              <p className="text-xs text-muted-foreground">
                共 {data.materials.length} 件物料
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="p-4">
            {/* 全选 */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <Checkbox
                checked={
                  selectedFiles.length === totalFiles && totalFiles > 0
                }
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">全选</span>
            </label>

            {/* 物料列表 */}
            <div className="space-y-4">
              {data.materials.map((material) => {
                const mFiles: DeliverableFile[] = material.files.filter(
                  (f: DeliverableFile) => f.kind === "M",
                );
                if (mFiles.length === 0) return null;
                return (
                  <div
                    key={material.materialId}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium truncate flex-1">
                        {material.materialName}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {material.materialType} · {mFiles.length} 个文件
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {mFiles.map((file: DeliverableFile, i: number) => (
                        <label
                          key={i}
                          className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-accent"
                        >
                          <Checkbox
                            checked={isSelected(
                              material.materialId,
                              file,
                            )}
                            onCheckedChange={(): void =>
                              toggleFile(material.materialId, file)
                            }
                          />
                          <span className="text-sm truncate flex-1">
                            {file.fileName}
                          </span>
                          {file.delivery === "external" ? (
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          ) : (
                            <Download className="size-3.5 text-muted-foreground" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            暂无文件
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            已选 {selectedFiles.length} / {totalFiles} 个文件
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          首次批量下载时浏览器可能要求确认，请选择「允许」
        </p>
        <Button
          className="w-full"
          disabled={selectedFiles.length === 0 || downloading}
          onClick={(): void => {
            void handleDownload();
          }}
        >
          {downloading ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              正在下载...
            </>
          ) : (
            <>
              <Download className="size-4 mr-2" />
              开始下载
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default KitExtractDrawer;
