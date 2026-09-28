import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  AlertTriangle,
  BellRing,
  Check,
  ChevronRight,
  Download,
  FileQuestion,
  Hourglass,
  Flag,
  Loader2,
  PackageX,
  Pencil,
  RefreshCw,
  RotateCcw,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@client/src/lib/logger";

import type {
  MaterialDetail,
  MaterialDetailResponse,
  MaterialEditFields,
  MaterialEditResponse,
} from "@shared/material";
import {
  translateMaterialStatus,
  type MaterialStatusLabel,
} from "@shared/status";
import type { SystemSettings } from "@shared/settings";
import { updateMaterialFields } from "@client/src/api/materials";
import PrereleaseReviewActions from "@client/src/components/PrereleaseReviewActions";
import { queryClient } from "@client/src/lib/query-client";
import {
  fetchMaterialDetailCached,
  invalidateLibrary,
  materialDetailQueryKey,
} from "@client/src/pages/library/library-queries";
import {
  receiveMaterial,
  retireMaterial,
  restoreMaterial,
  setMaterialSubscription,
} from "@client/src/api/actions";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@client/src/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@client/src/components/ui/empty";
import { Button } from "@client/src/components/ui/button";
import { Skeleton } from "@client/src/components/ui/skeleton";
import { Textarea } from "@client/src/components/ui/textarea";
import { useI18n } from "@client/src/hooks/use-i18n";
import { useIdentity } from "@client/src/hooks/use-identity";
import { useSystemSettings } from "@client/src/hooks/use-system-settings";
import { createMaterialDetailPt } from "./material-detail-i18n";
import {
  buildEditFields,
  createDraftFromMaterial,
  diffDraft,
  type EditDraft,
  EDIT_FIELD_LABEL_KEYS,
} from "./material-detail-utils";
import DeliveryCard from "./DeliveryCard";
import FeedbackDialog from "./FeedbackDialog";
import ShareDialog from "./ShareDialog";
import MaterialBanner from "./MaterialBanner";
import MaterialIdentity from "./MaterialIdentity";
import MaterialVisualActions from "./MaterialVisualActions";
import ProvenanceSection from "./ProvenanceSection";
import VersionTimeline from "./VersionTimeline";
import EditMaterialBar from "./EditMaterialBar";

type LoadError = "load" | "notFound" | null;

function extractHttpStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const maybe = error as { response?: { status?: unknown } };
  const status: unknown = maybe.response?.status;
  return typeof status === "number" ? status : null;
}

const DetailSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Skeleton className="aspect-[4/3] w-full rounded-md" />
    <Skeleton className="h-5 w-2/3 rounded" />
    <Skeleton className="h-4 w-1/3 rounded" />
    <Skeleton className="h-32 w-full rounded-md" />
    <Skeleton className="h-48 w-full rounded-md" />
  </div>
);

const MaterialDetailPage: React.FC = () => {
  const { baseRecordId } = useParams<{ baseRecordId: string }>();
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);
  const { identity } = useIdentity();
  const settings: SystemSettings | null = useSystemSettings();

  const [resp, setResp] = useState<MaterialDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LoadError>(null);
  const [received, setReceived] = useState<boolean>(false);
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [subBusy, setSubBusy] = useState<boolean>(false);
  const [deliveryOpen, setDeliveryOpen] = useState<boolean>(false);
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [retireOpen, setRetireOpen] = useState<boolean>(false);
  const [restoreOpen, setRestoreOpen] = useState<boolean>(false);
  const [retireReason, setRetireReason] = useState<string>("");
  const [retireBusy, setRetireBusy] = useState<boolean>(false);
  const [localReleaseStatus, setLocalReleaseStatus] = useState<string | null>(null);

  const currentVersion = resp?.versions?.find(
    (v) => v.isCurrentValid,
  );
  const retired: boolean =
    Boolean(currentVersion) && currentVersion?.versionStatus === "已停用";

  const displayReleaseStatus: string =
    localReleaseStatus ?? resp?.material.releaseStatus ?? "";
  const isOffline: boolean = displayReleaseStatus === "已下架";
  const canRetire: boolean = resp?.canRetire ?? false;

  const load = useCallback(async (): Promise<void> => {
    if (!baseRecordId) {
      return;
    }
    // 从物料库悬停预取过的详情直接渲染，不再闪骨架屏
    const prefetched: MaterialDetailResponse | undefined =
      queryClient.getQueryData(materialDetailQueryKey(baseRecordId));
    setLoading(prefetched === undefined);
    setError(null);
    setResp(prefetched ?? null);
    setEditing(false);
    setDraft(null);
    try {
      const data: MaterialDetailResponse =
        await fetchMaterialDetailCached(baseRecordId);
      setResp(data);
      setReceived(data.receivedByMe);
      setSubscribed(data.subscribedByMe);
      setLocalReleaseStatus(null);
    } catch (err: unknown) {
      logger.error(
        `Failed to load material detail: ${
          err instanceof Error ? err.stack ?? err.message : String(err)
        }`,
      );
      setError(extractHttpStatus(err) === 404 ? "notFound" : "load");
    } finally {
      setLoading(false);
    }
  }, [baseRecordId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 离开详情页即丢弃详情缓存：本页的领取、订阅、编辑等操作不会在下次进入时显示旧状态
  useEffect(() => {
    if (!baseRecordId) return undefined;
    return () => {
      queryClient.removeQueries({ queryKey: materialDetailQueryKey(baseRecordId) });
    };
  }, [baseRecordId]);

  const statusLabel: MaterialStatusLabel | null = resp
    ? translateMaterialStatus(
        resp.material.releaseStatus,
        resp.material.versionStatus,
      )
    : null;

  const dirtyKeys: Array<keyof MaterialEditFields> = useMemo(
    () => (draft && resp ? diffDraft(draft, resp.material) : []),
    [draft, resp],
  );

  const handleDraftChange = (patch: Partial<EditDraft>): void => {
    setDraft((prev: EditDraft | null) =>
      prev ? { ...prev, ...patch } : prev,
    );
  };

  const enterEdit = (): void => {
    if (!resp) {
      return;
    }
    setDraft(createDraftFromMaterial(resp.material));
    setEditing(true);
  };

  const handleCancel = (): void => {
    toast(pt("edit.discard", { n: dirtyKeys.length }));
    setEditing(false);
    setDraft(null);
  };

  const sourceFileVisible: boolean =
    identity?.roles?.some((role: string) =>
      ["设计师", "策划", "维护者"].includes(role),
    ) ?? false;

  const handleRetire = async (): Promise<void> => {
    if (!resp || !baseRecordId) {
      return;
    }
    const reason: string = retireReason.trim();
    if (reason.length === 0) {
      return;
    }
    setRetireBusy(true);
    try {
      const result = await retireMaterial({
        materialId: baseRecordId,
        reason,
      });
      setLocalReleaseStatus("已下架");
      invalidateLibrary(baseRecordId);
      setRetireOpen(false);
      setRetireReason("");
      toast.success(pt("retire.success"));
      if (result.subscriberCount > 0) {
        toast.info(
          pt("retire.subscriberNote", { n: result.subscriberCount }),
        );
      }
    } catch (err: unknown) {
      logger.error(
        `Retire failed: ${
          err instanceof Error ? err.stack ?? err.message : String(err)
        }`,
      );
      toast.error(pt("action.retireFail"));
    } finally {
      setRetireBusy(false);
    }
  };

  const handleRestore = async (): Promise<void> => {
    if (!resp || !baseRecordId) {
      return;
    }
    const reason: string = retireReason.trim();
    if (reason.length === 0) {
      return;
    }
    setRetireBusy(true);
    try {
      const result = await restoreMaterial({
        materialId: baseRecordId,
        reason,
      });
      setLocalReleaseStatus("已发布");
      invalidateLibrary(baseRecordId);
      setRestoreOpen(false);
      setRetireReason("");
      toast.success(pt("restore.success"));
      if (result.subscriberCount > 0) {
        toast.info(
          pt("restore.warn", { n: result.subscriberCount }),
        );
      }
    } catch (err: unknown) {
      logger.error(
        `Restore failed: ${
          err instanceof Error ? err.stack ?? err.message : String(err)
        }`,
      );
      toast.error(pt("action.restoreFail"));
    } finally {
      setRetireBusy(false);
    }
  };

  const handleReceive = (): void => {
    if (!resp || retired) {
      return;
    }
    setDeliveryOpen(true);
    // 并行异步记账，不阻塞下载
    void receiveMaterial(resp.material.baseRecordId).catch(() => {
      // 静默失败，不影响下载
    });
  };

  const handleSubscribeToggle = async (): Promise<void> => {
    if (!resp || subBusy) {
      return;
    }
    setSubBusy(true);
    try {
      await setMaterialSubscription(resp.material.baseRecordId, !subscribed);
      setSubscribed(!subscribed);
    } catch (err: unknown) {
      logger.error(
        `Subscribe toggle failed: ${
          err instanceof Error ? err.stack ?? err.message : String(err)
        }`,
      );
      toast.error(
        subscribed ? pt("action.unsubFail") : pt("action.subFail"),
      );
    } finally {
      setSubBusy(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!resp || !draft || saving || dirtyKeys.length === 0) {
      return;
    }
    setSaving(true);
    try {
      const fields: MaterialEditFields = buildEditFields(draft, dirtyKeys);
      const result: MaterialEditResponse = await updateMaterialFields(
        resp.material.baseRecordId,
        fields,
      );
      // 按返回 appliedFields 回显实际写入字段
      const updated: MaterialDetail = { ...resp.material };
      for (const applied of result.appliedFields) {
        if (applied === "material_name") {
          updated.materialName = draft.materialName.trim();
        } else if (applied === "is_recommended") {
          updated.isRecommended = draft.isRecommended;
        } else if (applied === "risk_label") {
          updated.riskLabel = [...draft.riskLabel];
        } else if (applied === "app_language") {
          updated.appLanguage = draft.appLanguage;
        } else if (applied === "applicable_region") {
          updated.applicableRegion = [...draft.applicableRegion];
        }
      }
      setResp({ ...resp, material: updated });
      invalidateLibrary();
      const labels: string[] = result.appliedFields.map((key) =>
        pt(EDIT_FIELD_LABEL_KEYS[key]),
      );
      toast.success(
        pt("edit.savedApplied", {
          fields: labels.join(language === "zh" ? "、" : ", "),
        }),
      );
      setEditing(false);
      setDraft(null);
    } catch (err: unknown) {
      logger.error(
        `Save material fields failed: ${
          err instanceof Error ? err.stack ?? err.message : String(err)
        }`,
      );
      toast.error(pt("edit.saveFail"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/library" className="rounded transition-colors hover:text-primary hover:underline">
          {t("nav.library")}
        </Link>
        <ChevronRight className="size-3.5 opacity-60" />
        {resp?.material.materialType ? (
          <Link
            to={`/library?materialType=${encodeURIComponent(resp.material.materialType)}`}
            className="rounded transition-colors hover:text-primary hover:underline"
          >
            {resp.material.materialType}
          </Link>
        ) : (
          <span>{resp?.material.materialType ?? ""}</span>
        )}
        <ChevronRight className="size-3.5 opacity-60" />
        <span className="truncate text-foreground" title={resp?.material.materialName ?? ""}>
          {resp?.material.materialName ?? ""}
        </span>
      </nav>

      <main
        className={editing ? "pb-28" : ""}
      >
        {loading ? (
          <DetailSkeleton />
        ) : error === "notFound" ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileQuestion className="size-5 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>{pt("detail.notFound.title")}</EmptyTitle>
              <EmptyDescription>
                {pt("detail.notFound.desc")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : error === "load" ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>{pt("detail.error.load")}</AlertTitle>
            <AlertDescription>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw className="size-3.5" />
                {t("common.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : resp && statusLabel ? (
          <>
            {resp.banner ? <MaterialBanner banner={resp.banner} /> : null}
            {resp.material.isPrerelease ? (
              <div className="space-y-3 rounded-md border border-warning/40 bg-warning/10 p-4">
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <Hourglass className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>
                    {language === "en"
                      ? "Pre-release: published by an AI assistant and downloadable as usual. It becomes official once the planner/auditor approves it."
                      : "预发布：由 AI 助手发布，可正常下载；策划人及审核人审核通过后转为正式发布。"}
                  </span>
                </div>
                {resp.canReviewPrerelease ? (
                  <PrereleaseReviewActions
                    materialId={resp.material.baseRecordId}
                    onDone={() => {
                      invalidateLibrary(resp.material.baseRecordId);
                      void load();
                    }}
                  />
                ) : null}
              </div>
            ) : null}
            <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-5">
                <MaterialVisualActions
                  material={resp.material}
                  roles={identity?.roles ?? []}
                />
                <VersionTimeline versions={resp.versions} />
              </div>
              <div className="space-y-5 lg:sticky lg:top-[76px]">
                <MaterialIdentity
                  material={resp.material}
                  editing={editing}
                  draft={draft}
                  dirtyKeys={dirtyKeys}
                  onDraftChange={handleDraftChange}
                />
                <div className="space-y-2">
                  <Button
                    onClick={handleReceive}
                    disabled={retired}
                    className="h-11 w-full rounded-[10px] text-[15px] font-semibold"
                  >
                    {received ? <Check size={16} /> : <Download size={16} />}
                    {retired
                      ? pt("action.retired")
                      : received
                        ? pt("action.redownload")
                        : pt("action.receive")}
                    <span className="font-mono opacity-80">
                      {currentVersion ? ` · ${currentVersion.versionNumber}` : ""}
                    </span>
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => void handleSubscribeToggle()}
                      disabled={subBusy}
                    >
                      {subBusy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <BellRing size={14} />
                      )}
                      {subscribed
                        ? pt("action.subscribed")
                        : pt("action.subscribe")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      disabled={!resp.material.allowExternalSend}
                      onClick={() => setShareOpen(true)}
                    >
                      <Share2 size={14} />
                      {pt("action.share")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setFeedbackOpen(true)}
                    >
                      <Flag size={14} />
                      {pt("action.report")}
                    </Button>
                  </div>
                </div>
                {resp && !editing && canRetire ? (
                  isOffline ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRetireReason("");
                        setRestoreOpen(true);
                      }}
                    >
                      <RotateCcw className="size-3.5" />
                      {pt("action.restore")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setRetireReason("");
                        setRetireOpen(true);
                      }}
                    >
                      <PackageX className="size-3.5" />
                      {pt("action.retire")}
                    </Button>
                  )
                ) : null}
                {resp && !editing ? (
                  identity?.canEditMaterial ? (
                    <Button variant="outline" size="sm" onClick={enterEdit}>
                      <Pencil size={13} />
                      {pt("detail.edit")}
                    </Button>
                  ) : (
                    <span
                      title={pt("detail.editNoPermission", {
                        roles: (identity?.roles ?? []).join(" / "),
                      })}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="opacity-60"
                      >
                        <Pencil size={13} />
                        {pt("detail.edit")}
                      </Button>
                    </span>
                  )
                ) : null}
                <ProvenanceSection material={resp.material} />
              </div>
            </div>
            <FeedbackDialog
              open={feedbackOpen}
              onOpenChange={setFeedbackOpen}
              materialId={resp.material.baseRecordId}
              versionId={currentVersion?.baseRecordId}
            />
            <DeliveryCard
              open={deliveryOpen}
              onClose={() => setDeliveryOpen(false)}
              materialName={resp.material.materialName}
              versionNumber={currentVersion?.versionNumber ?? ""}
              materialId={resp.material.baseRecordId}
              sourceFileVisible={sourceFileVisible}
            />
            <ShareDialog
              open={shareOpen}
              onOpenChange={setShareOpen}
              material={resp.material}
              statusLabel={statusLabel}
            />
            <Dialog
              open={retireOpen}
              onOpenChange={(open: boolean) => {
                if (!retireBusy) {
                  setRetireOpen(open);
                  if (!open) {
                    setRetireReason("");
                  }
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-destructive" />
                    {pt("retire.title", {
                      name: resp.material.materialName,
                    })}
                  </DialogTitle>
                  <DialogDescription className="space-y-2 text-left">
                    <p>{pt("retire.desc")}</p>
                    {resp.material.subscriber &&
                    resp.material.subscriber.length > 0 ? (
                      <p className="text-muted-foreground">
                        {pt("retire.subscriberNote", {
                          n: resp.material.subscriber.length,
                        })}
                      </p>
                    ) : null}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {pt("retire.reasonLabel")}
                  </label>
                  <Textarea
                    placeholder={pt("retire.reasonPlaceholder")}
                    value={retireReason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setRetireReason(e.target.value)
                    }
                    maxLength={200}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {pt("retire.charsLeft", {
                      n: 200 - retireReason.length,
                    })}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRetireOpen(false);
                      setRetireReason("");
                    }}
                    disabled={retireBusy}
                  >
                    {pt("edit.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleRetire()}
                    disabled={
                      retireReason.trim().length === 0 || retireBusy
                    }
                  >
                    {retireBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {pt("retire.confirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={restoreOpen}
              onOpenChange={(open: boolean) => {
                if (!retireBusy) {
                  setRestoreOpen(open);
                  if (!open) {
                    setRetireReason("");
                  }
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <RotateCcw className="size-5" />
                    {pt("restore.title", {
                      name: resp.material.materialName,
                    })}
                  </DialogTitle>
                  <DialogDescription className="space-y-2 text-left">
                    <p>{pt("restore.desc")}</p>
                    {resp.material.subscriber &&
                    resp.material.subscriber.length > 0 ? (
                      <p className="font-medium text-foreground">
                        {pt("restore.warn", {
                          n: resp.material.subscriber.length,
                        })}
                      </p>
                    ) : null}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {pt("restore.reasonLabel")}
                  </label>
                  <Textarea
                    placeholder={pt("restore.reasonPlaceholder")}
                    value={retireReason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setRetireReason(e.target.value)
                    }
                    maxLength={200}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {pt("retire.charsLeft", {
                      n: 200 - retireReason.length,
                    })}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRestoreOpen(false);
                      setRetireReason("");
                    }}
                    disabled={retireBusy}
                  >
                    {pt("edit.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleRestore()}
                    disabled={
                      retireReason.trim().length === 0 || retireBusy
                    }
                  >
                    {retireBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {pt("restore.confirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </main>

      {editing && draft ? (
        <EditMaterialBar
          dirtyCount={dirtyKeys.length}
          saving={saving}
          onSave={() => void handleSave()}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
};

export default MaterialDetailPage;
