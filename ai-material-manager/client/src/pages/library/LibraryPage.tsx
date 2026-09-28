import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Loader2,
  PackageSearch,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type { MaterialListItem } from "@shared/material";
import type { SystemSettings } from "@shared/settings";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@client/src/components/ui/alert";
import { Button } from "@client/src/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@client/src/components/ui/empty";
import PageHeader from "@client/src/components/PageHeader";
import { Skeleton } from "@client/src/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@client/src/components/ui/tabs";
import { useI18n } from "@client/src/hooks/use-i18n";
import { useIdentity } from "@client/src/hooks/use-identity";
import { useSystemSettings } from "@client/src/hooks/use-system-settings";
import { isValidExternalUrl } from "@client/src/utils/external-url";
import { cn } from "@/lib/utils";
import BackToTop from "@client/src/components/BackToTop";
import ActiveFilters, { type ActiveFilterItem } from "./ActiveFilters";
import KitsView from "./KitsView";
import { LIBRARY_I18N } from "./library-i18n";
import LibraryFilterBar from "./LibraryFilterBar";
import MaterialCard from "./MaterialCard";
import {
  ALL_VALUE,
  LIBRARY_PARAM as PARAM,
  parseLibraryFilters,
  useMaterialKits,
  useMaterialList,
  type LibraryFilters,
} from "./library-queries";

const SKELETON_KEYS: number[] = [0, 1, 2, 3, 4, 5, 6, 7];
/** 首屏大约两行卡片：立即加载并提高下载优先级，其余懒加载 */
const PRIORITY_CARD_COUNT: number = 8;
const GRID_CLASS: string =
  "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

type LibraryView = "materials" | "kits";

function mergeOptions(prev: string[], values: Array<string | null>): string[] {
  let merged: string[] | null = null;
  for (const value of values) {
    if (value !== null && value !== "" && !prev.includes(value)) {
      merged ??= [...prev];
      if (!merged.includes(value)) merged.push(value);
    }
  }
  return merged ?? prev;
}

const LibraryPage: React.FC = () => {
  const { language, t } = useI18n();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const settings: SystemSettings | null = useSystemSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const pt = (key: string): string => LIBRARY_I18N[key]?.[language] ?? t(key);

  const keyword: string = searchParams.get(PARAM.keyword) ?? "";
  const materialType: string =
    searchParams.get(PARAM.materialType) ?? ALL_VALUE;
  const region: string = searchParams.get(PARAM.region) ?? ALL_VALUE;
  const productModel: string =
    searchParams.get(PARAM.productModel) ?? ALL_VALUE;
  const externalOnly: boolean = searchParams.get(PARAM.externalOnly) === "1";
  const viewGlobal: boolean = searchParams.get(PARAM.viewGlobal) === "1";
  const view: LibraryView =
    searchParams.get(PARAM.view) === "kits" ? "kits" : "materials";

  const [keywordInput, setKeywordInput] = useState<string>(keyword);

  const updateParams = (patch: Record<string, string | null>): void => {
    // 以浏览器当前地址为准合并：路由切换以 transition 进行，组件内拿到的参数可能尚未更新，
    // 基于旧值合并会把刚清除的条件又写回去
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === ALL_VALUE) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next, { replace: true });
  };

  // 关键词输入防抖 300ms 后写入 URL
  useEffect(() => {
    const trimmed: string = keywordInput.trim();
    if (trimmed === keyword) return;
    const timer: number = window.setTimeout(() => {
      updateParams({ [PARAM.keyword]: trimmed });
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
    // URL 中的关键词追上输入框后需要重新判断，取消已无意义的防抖写入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordInput, keyword]);

  // 浏览器前进/后退导致 URL 变化时，同步回输入框
  useEffect(() => {
    setKeywordInput((current: string): string =>
      current.trim() === keyword ? current : keyword,
    );
  }, [keyword]);

  // 非 HQ 的内部用户才可切换「查看全球」；访客不受放宽，不展示开关
  const canViewGlobal: boolean =
    identity !== null && !identity.isVisitor && identity.area !== "HQ";

  const filters: LibraryFilters = useMemo(
    (): LibraryFilters => parseLibraryFilters(searchParams, canViewGlobal),
    [searchParams, canViewGlobal],
  );

  const list = useMaterialList(filters);
  const kits = useMaterialKits(view === "kits");

  const items: MaterialListItem[] = useMemo(
    (): MaterialListItem[] =>
      list.data?.pages.flatMap((page) => page.items) ?? [],
    [list.data],
  );
  const total: number | null = list.data?.pages[0]?.total ?? null;
  const showingPrevious: boolean = list.isPlaceholderData;
  const backgroundRefreshing: boolean =
    list.isFetching && !list.isFetchingNextPage && !list.isPending;

  // 下拉选项从已加载数据聚合（并集累积，避免筛选后选项收缩）
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  useEffect(() => {
    if (items.length === 0) return;
    setTypeOptions((prev) => mergeOptions(prev, items.map((item) => item.materialType)));
    setRegionOptions((prev) =>
      mergeOptions(prev, items.flatMap((item) => item.applicableRegion)),
    );
    setModelOptions((prev) => mergeOptions(prev, items.map((item) => item.productModel)));
  }, [items]);

  // 滚动到底部附近自动加载下一页；按钮作为无障碍与兜底入口
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const node: HTMLDivElement | null = sentinelRef.current;
    if (!node || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]): void => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  const activeFilters: ActiveFilterItem[] = [
    keyword !== "" && {
      key: "keyword",
      label: pt("library.filter.keyword"),
      value: keyword,
      onRemove: (): void => {
        setKeywordInput("");
        updateParams({ [PARAM.keyword]: null });
      },
    },
    materialType !== ALL_VALUE && {
      key: "materialType",
      label: pt("library.filter.materialType"),
      value: materialType,
      onRemove: (): void => updateParams({ [PARAM.materialType]: null }),
    },
    region !== ALL_VALUE && {
      key: "region",
      label: pt("library.filter.region"),
      value: region,
      onRemove: (): void => updateParams({ [PARAM.region]: null }),
    },
    productModel !== ALL_VALUE && {
      key: "productModel",
      label: pt("library.filter.productModel"),
      value: productModel,
      onRemove: (): void => updateParams({ [PARAM.productModel]: null }),
    },
    externalOnly && {
      key: "externalOnly",
      label: pt("library.filter.scope"),
      value: pt("library.filter.externalOnly"),
      onRemove: (): void => updateParams({ [PARAM.externalOnly]: null }),
    },
    viewGlobal && canViewGlobal && {
      key: "viewGlobal",
      label: pt("library.filter.scope"),
      value: pt("library.viewGlobal.label"),
      onRemove: (): void => updateParams({ [PARAM.viewGlobal]: null }),
    },
  ].filter((item): item is ActiveFilterItem => Boolean(item));
  const activeFilterCount: number = activeFilters.length;

  const clearFilters = (): void => {
    setKeywordInput("");
    updateParams({
      [PARAM.keyword]: null,
      [PARAM.materialType]: null,
      [PARAM.region]: null,
      [PARAM.productModel]: null,
      [PARAM.externalOnly]: null,
      [PARAM.viewGlobal]: null,
    });
  };

  const handleRequestMaterial = (): void => {
    const formUrl: string | null = settings?.uploadFormUrl ?? null;
    if (formUrl !== null && isValidExternalUrl(formUrl)) {
      window.open(formUrl.trim(), "_blank", "noopener,noreferrer");
      return;
    }
    toast.info(pt("library.empty.noForm"));
  };

  const emptyState: React.ReactNode = (
    <Empty className="rounded-xl border border-dashed border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageSearch className="size-5 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>{pt("library.empty.title")}</EmptyTitle>
        <EmptyDescription>{pt("library.empty.description")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          {activeFilterCount > 0 ? (
            <Button variant="outline" onClick={clearFilters}>
              {pt("library.filter.clear")}
            </Button>
          ) : null}
          <Button
            variant={activeFilterCount > 0 ? "ghost" : "outline"}
            onClick={handleRequestMaterial}
            data-ai-section-type="button"
          >
            {pt("library.empty.request")}
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  );

  const skeletonGrid: React.ReactNode = (
    <div className={GRID_CLASS} aria-busy="true">
      {SKELETON_KEYS.map((index: number) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-3.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );

  const errorAlert = (message: string, onRetry: () => void): React.ReactNode => (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>{message}</AlertTitle>
      <AlertDescription>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3" />
          {t("common.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );

  const loadedCount: number = items.length;

  return (
    <div>
      <PageHeader
        title={t("nav.library")}
        meta={
          <>
            <b className="font-semibold tabular-nums text-foreground">
              {total ?? "…"}
            </b>{" "}
            {pt("library.meta.available")}
            {identity?.area ? (
              <>
                {" · "}
                {pt("library.meta.area").replace("{area}", identity.area)}
              </>
            ) : null}
          </>
        }
        actions={
          identity?.isUploadRole ? (
            <Button onClick={() => navigate("/upload")}>
              <Upload className="size-4" />
              {t("nav.upload")}
            </Button>
          ) : null
        }
      />

      {viewGlobal && canViewGlobal ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-warning-text">
          <p className="text-sm">{pt("library.viewGlobal.banner")}</p>
        </div>
      ) : null}

      <LibraryFilterBar
        keywordInput={keywordInput}
        onKeywordChange={setKeywordInput}
        materialType={materialType}
        onMaterialTypeChange={(value) => updateParams({ [PARAM.materialType]: value })}
        region={region}
        onRegionChange={(value) => updateParams({ [PARAM.region]: value })}
        productModel={productModel}
        onProductModelChange={(value) => updateParams({ [PARAM.productModel]: value })}
        typeOptions={typeOptions}
        regionOptions={regionOptions}
        modelOptions={modelOptions}
        externalOnly={externalOnly}
        onExternalOnlyChange={(value) =>
          updateParams({ [PARAM.externalOnly]: value ? "1" : null })
        }
        canViewGlobal={canViewGlobal}
        viewGlobal={viewGlobal}
        onViewGlobalChange={(value) =>
          updateParams({ [PARAM.viewGlobal]: value ? "1" : null })
        }
        sticky={!identity?.isVisitor}
        allValue={ALL_VALUE}
        pt={pt}
      />

      <ActiveFilters items={activeFilters} onClearAll={clearFilters} pt={pt} />

      <Tabs
        value={view}
        onValueChange={(value: string): void =>
          updateParams({ [PARAM.view]: value === "kits" ? "kits" : null })
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <TabsList>
            <TabsTrigger value="materials">{pt("library.tab.materials")}</TabsTrigger>
            <TabsTrigger value="kits">{pt("library.tab.kits")}</TabsTrigger>
          </TabsList>
          <div
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-150",
              backgroundRefreshing || (view === "kits" && kits.isFetching && kits.data)
                ? "opacity-100"
                : "opacity-0",
            )}
            aria-live="polite"
          >
            <Loader2 className="size-3 animate-spin" />
            {pt("library.syncing")}
          </div>
        </div>

        <TabsContent value="materials">
          {list.isError && items.length === 0
            ? errorAlert(pt("library.error.load"), () => void list.refetch())
            : null}

          {list.isPending ? skeletonGrid : null}

          {list.isSuccess && items.length === 0 ? emptyState : null}

          {items.length > 0 ? (
            <>
              <div
                data-ai-section-type="card-list"
                className={cn(
                  GRID_CLASS,
                  "transition-opacity duration-150",
                  showingPrevious ? "pointer-events-none opacity-55" : "opacity-100",
                )}
                aria-busy={showingPrevious}
              >
                {items.map((item: MaterialListItem, index: number) => (
                  <MaterialCard
                    key={item.baseRecordId}
                    baseRecordId={item.baseRecordId}
                    materialName={item.materialName}
                    standardName={item.standardName}
                    materialType={item.materialType}
                    currentVersion={item.currentVersion}
                    previewUrl={item.previewUrl}
                    coverUrl={item.coverUrl}
                    thumbUrl={item.thumbUrl}
                    releaseStatus={item.releaseStatus}
                    versionStatus={item.versionStatus}
                    allowExternalSend={item.allowExternalSend}
                    productModel={item.productModel}
                    appLanguage={item.appLanguage}
                    isRecommended={item.isRecommended}
                    priority={index < PRIORITY_CARD_COUNT}
                    language={language}
                  />
                ))}
              </div>

              <div
                ref={sentinelRef}
                className="flex flex-col items-center gap-2 py-8 text-xs text-muted-foreground"
              >
                {total !== null ? (
                  <span className="tabular-nums">
                    {pt("library.progress")
                      .replace("{loaded}", String(loadedCount))
                      .replace("{total}", String(total))}
                  </span>
                ) : null}
                {list.hasNextPage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={list.isFetchingNextPage}
                    onClick={() => void list.fetchNextPage()}
                  >
                    {list.isFetchingNextPage ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                    {list.isFetchingNextPage
                      ? pt("library.loadingMore")
                      : pt("library.loadMore")}
                  </Button>
                ) : null}
                {list.isFetchNextPageError ? (
                  <span className="text-danger-text">{pt("library.error.load")}</span>
                ) : null}
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="kits">
          {kits.isError && !kits.data
            ? errorAlert(pt("library.error.loadKits"), () => void kits.refetch())
            : null}

          {kits.isPending && view === "kits" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SKELETON_KEYS.map((index: number) => (
                <Skeleton key={index} className="h-[120px] w-full rounded-xl" />
              ))}
            </div>
          ) : null}

          {kits.data &&
          kits.data.kits.length === 0 &&
          kits.data.otherMaterials.length === 0
            ? emptyState
            : null}

          {kits.data &&
          (kits.data.kits.length > 0 || kits.data.otherMaterials.length > 0) ? (
            <KitsView
              kits={kits.data.kits}
              otherMaterials={kits.data.otherMaterials}
              language={language}
              pt={pt}
            />
          ) : null}
        </TabsContent>
      </Tabs>

      <BackToTop label={pt("library.backToTop")} />
    </div>
  );
};

export default LibraryPage;
