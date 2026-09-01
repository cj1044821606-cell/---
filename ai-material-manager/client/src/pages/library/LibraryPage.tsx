import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, PackageSearch, RefreshCw, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logger } from "@client/src/lib/logger";

import type {
  MaterialKitsResponse,
  MaterialListItem,
  MaterialListResponse,
} from "@shared/material";
import type { SystemSettings } from "@shared/settings";
import { getMaterialKits, getMaterialList } from "@client/src/api/materials";
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
import { Badge } from "@client/src/components/ui/badge";
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
import KitsView from "./KitsView";
import { LIBRARY_I18N } from "./library-i18n";
import LibraryFilterBar from "./LibraryFilterBar";
import MaterialCard from "./MaterialCard";

const ALL_VALUE: string = "__all__";
const PAGE_LIMIT: number = 50;
/** 同一组筛选 30 秒内命中缓存，不重复请求 */
const CACHE_TTL_MS: number = 30_000;
const SKELETON_KEYS: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

type LibraryView = "materials" | "kits";

interface ListCacheEntry {
  key: string;
  data: MaterialListResponse;
  at: number;
}

interface KitsCacheEntry {
  data: MaterialKitsResponse;
  at: number;
}

const LibraryPage: React.FC = () => {
  const { language, t } = useI18n();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const settings: SystemSettings | null = useSystemSettings();

  const pt = (key: string): string => LIBRARY_I18N[key]?.[language] ?? t(key);

  const [view, setView] = useState<LibraryView>("materials");
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [materialType, setMaterialType] = useState<string>(
    searchParams.get("materialType") ?? ALL_VALUE,
  );
  const [region, setRegion] = useState<string>(ALL_VALUE);
  const [productModel, setProductModel] = useState<string>(ALL_VALUE);
  const [externalOnly, setExternalOnly] = useState<boolean>(false);
  const [viewGlobal, setViewGlobal] = useState<boolean>(false);

  const [listData, setListData] = useState<MaterialListResponse | null>(null);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const listCacheRef = useRef<ListCacheEntry | null>(null);

  const [kitsData, setKitsData] = useState<MaterialKitsResponse | null>(null);
  const [kitsLoading, setKitsLoading] = useState<boolean>(false);
  const [kitsError, setKitsError] = useState<string | null>(null);
  const kitsCacheRef = useRef<KitsCacheEntry | null>(null);

  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  // materialType 变化时同步到 URL
  useEffect(() => {
    if (materialType === ALL_VALUE) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ materialType }, { replace: true });
    }
  }, [materialType, setSearchParams]);

  // 关键词输入防抖 300ms
  useEffect(() => {
    const timer: number = window.setTimeout(() => {
      setKeyword(keywordInput.trim());
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [keywordInput]);

  const filterKey: string = useMemo(
    (): string =>
      JSON.stringify({
        keyword,
        materialType,
        region,
        productModel,
        externalOnly,
        viewGlobal,
        language,
      }),
    [keyword, materialType, region, productModel, externalOnly, viewGlobal, language],
  );

  const mergeOptions = (
    prev: string[],
    values: Array<string | null>,
  ): string[] => {
    const merged: string[] = [...prev];
    for (const value of values) {
      if (value !== null && value !== "" && !merged.includes(value)) {
        merged.push(value);
      }
    }
    return merged;
  };

  // 下拉选项从已加载数据聚合（并集累积，避免筛选后选项收缩）
  useEffect(() => {
    if (listData === null) return;
    setTypeOptions((prev: string[]): string[] =>
      mergeOptions(
        prev,
        listData.items.map((item: MaterialListItem): string => item.materialType),
      ),
    );
    setRegionOptions((prev: string[]): string[] =>
      mergeOptions(
        prev,
        listData.items.flatMap(
          (item: MaterialListItem): string[] => item.applicableRegion,
        ),
      ),
    );
    setModelOptions((prev: string[]): string[] =>
      mergeOptions(
        prev,
        listData.items.map(
          (item: MaterialListItem): string | null => item.productModel,
        ),
      ),
    );
  }, [listData]);

  const loadList = useCallback(
    async (force: boolean = false): Promise<void> => {
      const cached: ListCacheEntry | null = listCacheRef.current;
      if (
        !force &&
        cached !== null &&
        cached.key === filterKey &&
        Date.now() - cached.at < CACHE_TTL_MS
      ) {
        setListData(cached.data);
        setListError(null);
        return;
      }
      setListLoading(true);
      setListError(null);
      try {
        const data: MaterialListResponse = await getMaterialList({
          keyword: keyword !== "" ? keyword : undefined,
          materialType: materialType !== ALL_VALUE ? materialType : undefined,
          region: region !== ALL_VALUE ? region : undefined,
          productModel: productModel !== ALL_VALUE ? productModel : undefined,
          externalOnly: externalOnly ? true : undefined,
          viewGlobal: viewGlobal ? true : undefined,
          offset: 0,
          limit: PAGE_LIMIT,
        });
        listCacheRef.current = { key: filterKey, data, at: Date.now() };
        setListData(data);
      } catch (err: unknown) {
        logger.error(
          `Failed to load materials: ${
            err instanceof Error ? err.stack ?? err.message : String(err)
          }`,
        );
        setListError(pt("library.error.load"));
      } finally {
        setListLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, language],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadKits = useCallback(
    async (force: boolean = false): Promise<void> => {
      const cached: KitsCacheEntry | null = kitsCacheRef.current;
      if (!force && cached !== null && Date.now() - cached.at < CACHE_TTL_MS) {
        setKitsData(cached.data);
        setKitsError(null);
        return;
      }
      setKitsLoading(true);
      setKitsError(null);
      try {
        const data: MaterialKitsResponse = await getMaterialKits();
        kitsCacheRef.current = { data, at: Date.now() };
        setKitsData(data);
      } catch (err: unknown) {
        logger.error(
          `Failed to load material kits: ${
            err instanceof Error ? err.stack ?? err.message : String(err)
          }`,
        );
        setKitsError(pt("library.error.loadKits"));
      } finally {
        setKitsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language],
  );

  useEffect(() => {
    if (view === "kits") {
      void loadKits();
    }
  }, [view, loadKits]);

  // 非 HQ 的内部用户才可切换「查看全球」；访客不受放宽，不展示开关
  const canViewGlobal: boolean =
    identity !== null && !identity.isVisitor && identity.area !== "HQ";

  const handleRequestMaterial = (): void => {
    const formUrl: string | null = settings?.uploadFormUrl ?? null;
    if (formUrl !== null && isValidExternalUrl(formUrl)) {
      window.open(formUrl.trim(), "_blank", "noopener,noreferrer");
      return;
    }
    toast.info(pt("library.empty.noForm"));
  };

  const subtitle: string =
    listData !== null
      ? pt("library.total").replace("{total}", String(listData.total))
      : pt("library.page.subtitle");

  const emptyState: React.ReactNode = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageSearch className="size-5 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>{pt("library.empty.title")}</EmptyTitle>
        <EmptyDescription>
          {pt("library.empty.description")}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          onClick={handleRequestMaterial}
          data-ai-section-type="button"
        >
          {pt("library.empty.request")}
        </Button>
      </EmptyContent>
    </Empty>
  );

  return (
    <div>
      <PageHeader
        title={t("nav.library")}
        meta={<><b className="font-semibold text-foreground tabular-nums">{listData?.total ?? 0}</b> 件可用 · 你在 {identity?.area ?? "…"}，看到的是本区 + 全区域物料</>}
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
        onMaterialTypeChange={setMaterialType}
        region={region}
        onRegionChange={setRegion}
        productModel={productModel}
        onProductModelChange={setProductModel}
        typeOptions={typeOptions}
        regionOptions={regionOptions}
        modelOptions={modelOptions}
        externalOnly={externalOnly}
        onExternalOnlyChange={setExternalOnly}
        canViewGlobal={canViewGlobal}
        viewGlobal={viewGlobal}
        onViewGlobalChange={setViewGlobal}
        allValue={ALL_VALUE}
        pt={pt}
      />

      <Tabs
        value={view}
        onValueChange={(value: string): void => setView(value as LibraryView)}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="materials">
            {pt("library.tab.materials")}
          </TabsTrigger>
          <TabsTrigger value="kits">{pt("library.tab.kits")}</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          {listError !== null ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>{listError}</AlertTitle>
              <AlertDescription>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(): void => {
                    void loadList(true);
                  }}
                >
                  <RefreshCw className="size-3" />
                  {t("common.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {listError === null && listLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {SKELETON_KEYS.map((index: number) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-md border border-border bg-card shadow-sm"
                >
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {listError === null &&
          !listLoading &&
          listData !== null &&
          listData.items.length === 0
            ? emptyState
            : null}

          {listError === null &&
          !listLoading &&
          listData !== null &&
          listData.items.length > 0 ? (
            <div
              data-ai-section-type="card-list"
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {listData.items.map((item: MaterialListItem) => (
                <MaterialCard
                  key={item.baseRecordId}
                  baseRecordId={item.baseRecordId}
                  materialName={item.materialName}
                  standardName={item.standardName}
                  materialType={item.materialType}
                  currentVersion={item.currentVersion}
                  previewUrl={item.previewUrl}
                  coverUrl={item.coverUrl}
                  releaseStatus={item.releaseStatus}
                  versionStatus={item.versionStatus}
                  allowExternalSend={item.allowExternalSend}
                  language={language}
                />
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="kits">
          {kitsError !== null ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>{kitsError}</AlertTitle>
              <AlertDescription>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(): void => {
                    void loadKits(true);
                  }}
                >
                  <RefreshCw className="size-3" />
                  {t("common.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {kitsError === null && kitsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SKELETON_KEYS.map((index: number) => (
                <Skeleton key={index} className="h-[120px] w-full rounded-md" />
              ))}
            </div>
          ) : null}

          {kitsError === null &&
          !kitsLoading &&
          kitsData !== null &&
          kitsData.kits.length === 0 &&
          kitsData.otherMaterials.length === 0
            ? emptyState
            : null}

          {kitsError === null &&
          !kitsLoading &&
          kitsData !== null &&
          (kitsData.kits.length > 0 || kitsData.otherMaterials.length > 0) ? (
            <KitsView
              kits={kitsData.kits}
              otherMaterials={kitsData.otherMaterials}
              language={language}
              pt={pt}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LibraryPage;
