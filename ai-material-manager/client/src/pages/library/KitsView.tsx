import React, { useState } from "react";
import { Check, Download, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@client/src/lib/logger";

import type {
  MaterialKit,
  MaterialKitItem,
  MaterialOtherItem,
  ReceiveBatchActionResponse,
} from "@shared/material";
import { receiveMaterialBatch } from "@client/src/api/actions";
import { Button } from "@client/src/components/ui/button";
import type { Language } from "@client/src/i18n/dictionary";
import KitExtractDrawer from "./KitExtractDrawer";
import MaterialCard from "./MaterialCard";

export interface KitsViewProps {
  kits: MaterialKit[];
  otherMaterials: MaterialOtherItem[];
  language: Language;
  pt: (key: string) => string;
}

const KitsView: React.FC<KitsViewProps> = ({
  kits,
  otherMaterials,
  language,
  pt,
}: KitsViewProps) => {
  const [pendingModels, setPendingModels] = useState<Set<string>>(
    new Set<string>(),
  );
  const [receivedModels, setReceivedModels] = useState<Set<string>>(
    new Set<string>(),
  );
  const [extractProductModel, setExtractProductModel] = useState<
    string | null
  >(null);

  // 乐观禁用防重复：点击即进入 pending/禁用，失败才恢复可点
  const handleReceiveKit = async (kit: MaterialKit): Promise<void> => {
    if (
      pendingModels.has(kit.productModel) ||
      receivedModels.has(kit.productModel)
    ) {
      return;
    }
    setPendingModels((prev: Set<string>): Set<string> => {
      const next: Set<string> = new Set(prev);
      next.add(kit.productModel);
      return next;
    });
    try {
      const materialIds: string[] = kit.items.map(
        (item: MaterialKitItem): string => item.baseRecordId,
      );
      const result: ReceiveBatchActionResponse =
        await receiveMaterialBatch(materialIds);
      setReceivedModels((prev: Set<string>): Set<string> => {
        const next: Set<string> = new Set(prev);
        next.add(kit.productModel);
        return next;
      });
      toast.success(
        pt("library.kit.toast.done")
          .replace("{created}", String(result.created))
          .replace("{skipped}", String(result.skipped)),
      );
    } catch (err: unknown) {
      logger.error(
        `Failed to receive kit ${kit.productModel}: ${
          err instanceof Error ? err.stack ?? err.message : String(err)
        }`,
      );
      toast.error(pt("library.kit.toast.error"));
    } finally {
      setPendingModels((prev: Set<string>): Set<string> => {
        const next: Set<string> = new Set(prev);
        next.delete(kit.productModel);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {kits.length > 0 ? (
        <section
          data-ai-section-type="card-list"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {kits.map((kit: MaterialKit) => {
            const isReceived: boolean = receivedModels.has(kit.productModel);
            const isPending: boolean = pendingModels.has(kit.productModel);
            return (
              <div
                key={kit.productModel}
                className="rounded-md border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PackageOpen className="size-4 shrink-0 text-primary" />
                      <h3 className="truncate font-mono text-sm font-semibold text-foreground">
                        {kit.productModel}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pt("library.kit.count").replace(
                        "{count}",
                        String(kit.count),
                      )}
                    </p>
                    {kit.typeList.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {kit.typeList.map((type: string) => (
                          <span
                            key={type}
                            className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(): void =>
                        setExtractProductModel(kit.productModel)
                      }
                      className="min-h-[38px]"
                      data-ai-section-type="button"
                    >
                      <Download className="size-3" />
                      {"提取"}
                    </Button>
                    <Button
                      size="sm"
                      variant={isReceived ? "outline" : "default"}
                      disabled={isReceived || isPending}
                      onClick={(): void => {
                        void handleReceiveKit(kit);
                      }}
                      className="min-h-[38px]"
                      data-ai-section-type="button"
                    >
                      {isReceived ? <Check className="size-3" /> : null}
                      {isReceived
                        ? pt("library.kit.received")
                        : pt("library.kit.receive")}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {otherMaterials.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {pt("library.others.title")}
          </h2>
          <div
            data-ai-section-type="card-list"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {otherMaterials.map((item: MaterialOtherItem) => (
              <MaterialCard
                key={item.baseRecordId}
                baseRecordId={item.baseRecordId}
                materialName={item.materialName}
                materialType={item.materialType}
                previewUrl={item.previewUrl}
                language={language}
              />
            ))}
          </div>
        </section>
      ) : null}

      {extractProductModel !== null ? (
        <KitExtractDrawer
          open={extractProductModel !== null}
          onClose={(): void => setExtractProductModel(null)}
          productModel={extractProductModel}
          materialIds={
            kits.find(
              (k: MaterialKit) =>
                k.productModel === extractProductModel,
            )?.items.map(
              (item: MaterialKitItem) => item.baseRecordId,
            ) ?? []
          }
        />
      ) : null}
    </div>
  );
};

export default KitsView;
