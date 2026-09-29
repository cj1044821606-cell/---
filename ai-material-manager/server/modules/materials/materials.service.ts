import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Identity } from "@shared/identity";
import type { CloudFileRef, DeliverableFile, KitFilesResponse, MaterialFilesResponse } from "@shared/files";
import type {
  MaterialDetail,
  MaterialDetailResponse,
  MaterialEditFields,
  MaterialEditResponse,
  MaterialKit,
  MaterialKitItem,
  MaterialKitsResponse,
  MaterialListItem,
  MaterialListResponse,
  MaterialOtherItem,
  VersionBanner,
  VersionItem,
} from "@shared/material";
import {
  MATERIAL_EDIT_WHITELIST,
  RELEASE_STATUS,
  VERSION_STATUS,
  type MaterialEditFieldKey,
} from "@server/common/constants/bitable.constants";
import { extractLinkRecordIds } from "@server/common/utils/bitable-link.util";
import {
  areaVisibleInRegions,
  GLOBAL_REGION_CODE,
  regionsIncludeCode,
} from "@server/common/utils/region-match.util";
import { IdentityService } from "@server/modules/identity/identity.service";
import {
  BitableWriteService,
  type MaterialMainLiveRecord,
  type MaterialMainUpdateFields,
} from "@server/modules/actions/bitable-write.service";
import { FilesService } from "@server/modules/files/files.service";
import { ThumbnailService, selectPreviewSource } from "@server/modules/files/thumbnail.service";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import { mergeCloudChannels } from "@server/modules/files/cloud-files.util";
import { selectVersionHistory } from "./version-history.util";

interface MaterialAssetMainRow extends Record<string, unknown> {
  baseRecordId: string;
  materialName: string | null;
  relatedProcessPool: unknown;
  currentVersion: string | null;
  riskLabel: string[];
  validityPeriod: Date | null;
  previewFileS: string[];
  appLanguage: string | null;
  releaseStatus: string | null;
  publishTime: Date | null;
  versionRecord: unknown;
  productModel: string | null;
  currentValidAttachment: string[];
  createTime: Date | null;
  publishRecord: unknown;
  coverImage: string[];
  allowExternalSend: boolean;
  productLine: string | null;
  sourceFileL: string[];
  plannerApprover: string | null;
  versionStatus: string | null;
  applicableRegion: string[];
  materialType: string | null;
  isRecommended: boolean;
  standardName: string | null;
  designer: string | null;
  appInternalMaterialId: string | null;
  productSeries: string | null;
  productOrBrandMaterial: string | null;
  regionalSecondaryCreationRecord: unknown;
  receiptRecord: unknown;
  issueFeedback: unknown;
  subscriber: string[];
  replacedOldVersion: unknown;
  appMaterialId: string | null;
  cloudDiskLinkM: string | null;
  cloudDiskLinkL: string | null;
  cloudDiskLinkS: string | null;
  cloudFilesM?: CloudFileRef[];
  cloudFilesL?: CloudFileRef[];
  cloudFilesS?: CloudFileRef[];
  isLargeFile: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RETIRE_ROLES: string[] = ["审核人", "维护者", "设计师", "策划"];
interface VersionRecordRow extends Record<string, unknown> {
  baseRecordId: string;
  standardNaming: string | null;
  appInternalMaterialId: string | null;
  versionNumber: string | null;
  versionType: string | null;
  versionStatus: string | null;
  isCurrentValid: boolean;
  compareOldVersion?: unknown;
  replacementVersion?: unknown;
  publishTime: Date | null;
  aiComparisonSummary: string | null;
  modifyReason: string | null;
  modifier: string | null;
  createTime: Date | null;
}

interface FamilyMaterialRow {
  baseRecordId: string | null;
  appInternalMaterialId: string | null;
  releaseStatus: string | null;
  versionStatus: string | null;
}

interface UserReceiveRow extends Record<string, unknown> {
  receiveDownloadPerson: string | null;
  material: unknown;
  version: unknown;
  downloadTime: Date | null;
  isReplacedNewVersion: boolean | null;
}


function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown): boolean => typeof item === "string")
  );
}

const PRODUCT_MATERIAL: string = "产品物料";

export interface MaterialListQuery {
  keyword?: string;
  materialType?: string;
  region?: string;
  productModel?: string;
  externalOnly?: boolean;
  viewGlobal?: boolean;
  offset: number;
  limit: number;
}

/** region 参数可能是纯码（"HQ"）或「码+名称」（"HQ-总部" / "GLOBAL 全球"），统一取首段码 */
function extractRegionCode(region: string | undefined): string {
  if (!region) return "";
  return region.trim().split(/[\s-]/u)[0] ?? "";
}

@Injectable()
export class MaterialsService {
  private readonly logger: Logger = new Logger(MaterialsService.name);

  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly identityService: IdentityService,
    private readonly bitableWriteService: BitableWriteService,
    private readonly filesService: FilesService,
    private readonly thumbnails: ThumbnailService,
  ) {}

  async getMaterialDetail(
    userId: string,
    baseRecordId: string,
  ): Promise<MaterialDetailResponse> {
    const identity: Identity = await this.identityService.resolve(userId);

    let material: MaterialAssetMainRow;
    try {
      material = await this.base.rowById<MaterialAssetMainRow>(
        "main",
        baseRecordId,
      );
    } catch {
      throw new NotFoundException("物料不存在");
    }
    if (!this.isMaterialVisible(material, identity)) {
      throw new NotFoundException("物料不存在");
    }

    const canSeeSource = this.canSeeSourceFiles(identity);
    const detail: MaterialDetail = this.mapMaterialDetail(
      material,
      userId,
      canSeeSource,
    );

    const allVersionRows = await this.base.rows<VersionRecordRow>("version");
    const versionRows = selectVersionHistory(
      allVersionRows,
      material.appInternalMaterialId,
      extractLinkRecordIds(material.versionRecord),
    ).sort(
      (a, b) =>
        (b.createTime?.getTime() ?? 0) - (a.createTime?.getTime() ?? 0),
    );

    const receiveRows = (await this.base.rows<UserReceiveRow>("receive")).filter(
      (row) => row.receiveDownloadPerson === userId,
    );

    const receivedAtByVersion: Map<string, string> =
      this.buildReceivedAtMap(receiveRows);
    const versions: VersionItem[] = versionRows.map(
      (version: VersionRecordRow): VersionItem => ({
        baseRecordId: version.baseRecordId ?? "",
        versionNumber: version.versionNumber ?? "",
        versionType: version.versionType ?? "",
        versionStatus: version.versionStatus ?? "",
        isCurrentValid: version.isCurrentValid ?? false,
        publishTime: this.toIsoDate(version.publishTime),
        aiComparisonSummary: version.aiComparisonSummary,
        modifyReason: version.modifyReason,
        modifier: version.modifier,
        receivedByMeAt: version.baseRecordId
          ? (receivedAtByVersion.get(version.baseRecordId) ?? null)
          : null,
      }),
    );

    const familyRows: FamilyMaterialRow[] =
      await this.loadFamilyRows(material);
    const familyMaterialIds: Set<string> = new Set(
      familyRows
        .map((row: FamilyMaterialRow): string | null => row.baseRecordId)
        .filter((id: string | null): id is string => typeof id === "string"),
    );
    const familyInternalIds: string[] = [
      ...new Set(
        familyRows
          .map(
            (row: FamilyMaterialRow): string | null =>
              row.appInternalMaterialId,
          )
          .filter(
            (id: string | null): id is string => typeof id === "string",
          ),
      ),
    ];

    const familyVersionIds = new Set(
      allVersionRows
        .filter((row) =>
          familyInternalIds.includes(row.appInternalMaterialId ?? ""),
        )
        .map((row) => row.baseRecordId)
        .filter(Boolean),
    );

    const familyReceiveRows: UserReceiveRow[] = receiveRows.filter(
      (row: UserReceiveRow): boolean =>
        extractLinkRecordIds(row.material).some(
          (id: string): boolean => familyMaterialIds.has(id),
        ) ||
        extractLinkRecordIds(row.version).some(
          (id: string): boolean => familyVersionIds.has(id),
        ),
    );

    const receivedByMe: boolean = familyReceiveRows.length > 0;
    const banner: VersionBanner | null = this.resolveBanner(
      material,
      familyRows,
      familyReceiveRows,
    );
    const subscribedByMe: boolean = (material.subscriber ?? []).includes(
      userId,
    );

    const canRetire: boolean =
      RETIRE_ROLES.some(
        (role: string): boolean => identity.roles.includes(role as any),
      ) ||
      (material.plannerApprover !== null &&
        material.plannerApprover === userId) ||
      (material.designer !== null && material.designer === userId);

    return {
      material: detail,
      versions,
      banner,
      subscribedByMe,
      receivedByMe,
      canRetire,
    };
  }

  async updateMaterial(
    userId: string,
    baseRecordId: string,
    fields: MaterialEditFields,
  ): Promise<MaterialEditResponse> {
    const identity: Identity = await this.identityService.resolve(userId);
    if (!identity.canEditMaterial) {
      throw new ForbiddenException("无物料编辑权限");
    }

    this.validateEditFields(fields);

    const appliedFields: MaterialEditFieldKey[] =
      MATERIAL_EDIT_WHITELIST.filter(
        (key: MaterialEditFieldKey): boolean => fields[key] !== undefined,
      );
    if (appliedFields.length === 0) {
      throw new BadRequestException("未提交可编辑字段");
    }

    // 先读实时值再写回：校验记录存在性，并为读-改-写字段（风险标签/适用区域）留底
    const live: MaterialMainLiveRecord =
      await this.bitableWriteService.getMaterialMainRecord(baseRecordId);

    const updateFields: MaterialMainUpdateFields = {};
    if (fields.material_name !== undefined) {
      updateFields.materialName = fields.material_name;
    }
    if (fields.is_recommended !== undefined) {
      updateFields.isRecommended = fields.is_recommended;
    }
    if (fields.validity_period !== undefined) {
      updateFields.validityPeriod = fields.validity_period;
    }
    if (fields.app_language !== undefined) {
      updateFields.appLanguage = fields.app_language;
    }
    if (fields.risk_label !== undefined) {
      updateFields.riskLabel = fields.risk_label;
    }
    if (fields.applicable_region !== undefined) {
      updateFields.applicableRegion = fields.applicable_region;
    }

    await this.bitableWriteService.updateMaterialMainRecord(
      baseRecordId,
      updateFields,
    );
    this.logger.log(
      `Material updated: record=${baseRecordId} operator=${userId} applied=${JSON.stringify(appliedFields)} liveRiskLabel=${JSON.stringify(live.riskLabel)} liveApplicableRegion=${JSON.stringify(live.applicableRegion)}`,
    );
    return { success: true, appliedFields };
  }

  /**
   * 物料列表：服务端强制 release_status=已发布 + 市场/访客可见性过滤，过滤不下放前端。
   * 排序策略（自选）：推荐物料（is_recommended）优先，同级内按 _updated_at 降序。
   */
  async listMaterials(
    userId: string,
    query: MaterialListQuery,
  ): Promise<MaterialListResponse> {
    const identity: Identity = await this.identityService.resolve(userId);
    const keyword: string = (query.keyword ?? "").trim();

    // 服务端强制条件：仅已发布；关键词模糊匹配物料名称/标准命名/产品型号
    const keywordLower = keyword.toLocaleLowerCase();
    const rows = (
      await this.base.rows<MaterialAssetMainRow>("main")
    ).filter(
      (row) =>
        row.releaseStatus === RELEASE_STATUS.published &&
        (keywordLower.length === 0 ||
          [row.materialName, row.standardName, row.productModel].some((value) =>
            (value ?? "").toLocaleLowerCase().includes(keywordLower),
          )),
    );

    const regionCode: string = extractRegionCode(query.region);

    const filtered: MaterialAssetMainRow[] = rows.filter(
      (row: MaterialAssetMainRow): boolean => {
        if (
          !this.isMaterialVisible(row, identity, query.viewGlobal === true)
        ) {
          return false;
        }
        if (
          regionCode !== "" &&
          !regionsIncludeCode(row.applicableRegion ?? [], regionCode)
        ) {
          return false;
        }
        if (query.materialType && row.materialType !== query.materialType) {
          return false;
        }
        if (
          query.productModel &&
          (row.productModel ?? "").trim().toLowerCase() !==
            query.productModel.trim().toLowerCase()
        ) {
          return false;
        }
        if (query.externalOnly === true && row.allowExternalSend !== true) {
          return false;
        }
        return true;
      },
    );

    // 排序：is_recommended 降序优先（推荐置顶），再按 _updated_at 降序
    filtered.sort(
      (a: MaterialAssetMainRow, b: MaterialAssetMainRow): number => {
        const recommendedA: number = a.isRecommended === true ? 1 : 0;
        const recommendedB: number = b.isRecommended === true ? 1 : 0;
        if (recommendedA !== recommendedB) return recommendedB - recommendedA;
        const updatedA: number = a.updatedAt?.getTime() ?? 0;
        const updatedB: number = b.updatedAt?.getTime() ?? 0;
        return updatedB - updatedA;
      },
    );

    // 后台预热本次筛选结果的所有缩略图（不止当前页），滚动/翻页时已经就绪
    this.thumbnails.warm(filtered.map((row) => this.primaryImage(row)));

    const total: number = filtered.length;
    const items: MaterialListItem[] = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((row: MaterialAssetMainRow): MaterialListItem =>
        this.mapMaterialListItem(row, userId),
      );
    return { items, total };
  }

  /**
   * 资料包视图：服务端聚合不分页。产品物料且有型号的按 product_model 聚合为 kits，
   * 其余（品牌/展会/无型号）进 otherMaterials；与列表同口径的已发布+市场/访客过滤。
   */
  async getMaterialKits(userId: string): Promise<MaterialKitsResponse> {
    const identity: Identity = await this.identityService.resolve(userId);

    const rows = (
      await this.base.rows<MaterialAssetMainRow>("main")
    )
      .filter((row) => row.releaseStatus === RELEASE_STATUS.published)
      .sort(
        (a, b) =>
          (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
      );

    const kitByModel: Map<string, MaterialKit> = new Map<string, MaterialKit>();
    const otherMaterials: MaterialOtherItem[] = [];

    for (const row of rows) {
      if (!this.isMaterialVisible(row, identity)) continue;
      const materialType: string = row.materialType ?? "";
      const productModel: string = (row.productModel ?? "").trim();
      const isProductKit: boolean =
        row.productOrBrandMaterial === PRODUCT_MATERIAL && productModel !== "";

      if (isProductKit) {
        const kit: MaterialKit =
          kitByModel.get(productModel) ??
          { productModel, count: 0, typeList: [], items: [] };
        kit.count += 1;
        if (materialType !== "" && !kit.typeList.includes(materialType)) {
          kit.typeList.push(materialType);
        }
        if (row.baseRecordId !== null) {
          const item: MaterialKitItem = {
            baseRecordId: row.baseRecordId,
            materialName: row.materialName ?? "",
            materialType,
            currentVersion: row.currentVersion ?? "",
          };
          kit.items.push(item);
        }
        kitByModel.set(productModel, kit);
      } else if (row.baseRecordId !== null) {
        const other: MaterialOtherItem = {
          baseRecordId: row.baseRecordId,
          materialName: row.materialName ?? "",
          materialType,
          previewUrl: this.filesService.makeMediaUrl(
            row.previewFileS?.[0] ?? row.coverImage?.[0],
            userId,
          ),
          thumbUrl: this.thumbnails.makeThumbUrl(this.primaryImage(row), userId),
        };
        otherMaterials.push(other);
      }
    }

    const kits: MaterialKit[] = [...kitByModel.values()].sort(
      (a: MaterialKit, b: MaterialKit): number => b.count - a.count,
    );
    return { kits, otherMaterials };
  }

  private isMaterialVisible(
    material: MaterialAssetMainRow,
    identity: Identity,
    viewGlobal: boolean = false,
  ): boolean {
    if (material.releaseStatus !== RELEASE_STATUS.published) return false;
    const regions: string[] = material.applicableRegion ?? [];
    // 访客口径最严：仅 GLOBAL + 允许外发，viewGlobal 不放宽
    if (identity.isVisitor) {
      return (
        regionsIncludeCode(regions, GLOBAL_REGION_CODE) &&
        material.allowExternalSend === true
      );
    }
    // 总部看全部已发布物料，不受适用区域限制
    if (identity.area === "HQ") return true;
    // 「查看全球」仅跳过市场过滤，已发布校验已在上方强制
    if (viewGlobal) return true;
    return areaVisibleInRegions(regions, identity.area);
  }

  /** 封面主图：预览图优先，其次封面图，与前端降级链一致 */
  private primaryImage(row: MaterialAssetMainRow): string | undefined {
    const candidates = [...(row.previewFileS ?? []), ...(row.coverImage ?? []), ...(row.currentValidAttachment ?? [])];
    return selectPreviewSource(candidates);
  }

  private mapMaterialListItem(
    row: MaterialAssetMainRow,
    userId: string,
  ): MaterialListItem {
    return {
      baseRecordId: row.baseRecordId ?? "",
      materialName: row.materialName ?? "",
      standardName: row.standardName ?? "",
      materialType: row.materialType ?? "",
      productModel: row.productModel,
      productLine: row.productLine,
      productOrBrandMaterial: row.productOrBrandMaterial,
      appLanguage: row.appLanguage ?? "",
      applicableRegion: row.applicableRegion ?? [],
      currentVersion: row.currentVersion ?? "",
      releaseStatus: row.releaseStatus ?? "",
      versionStatus: row.versionStatus ?? "",
      allowExternalSend: row.allowExternalSend ?? false,
      isRecommended: row.isRecommended ?? false,
      riskLabel: row.riskLabel ?? [],
      previewUrl: this.filesService.makeMediaUrl(row.previewFileS?.[0], userId),
      coverUrl: this.filesService.makeMediaUrl(row.coverImage?.[0], userId),
      thumbUrl: this.thumbnails.makeThumbUrl(this.primaryImage(row), userId),
      isLargeFile: row.isLargeFile ?? false,
    };
  }

  private mapMaterialDetail(
    material: MaterialAssetMainRow,
    userId: string,
    canSeeSource: boolean,
  ): MaterialDetail {
    return {
      ...this.mapMaterialListItem(material, userId),
      appMaterialId: material.appMaterialId ?? "",
      appInternalMaterialId: material.appInternalMaterialId ?? "",
      currentValidAttachment: (material.currentValidAttachment ?? [])
        .map((value) =>
          this.filesService.makeMediaUrl(value, userId, "attachment"),
        )
        .filter((value): value is string => value !== null),
      sourceFileL: canSeeSource
        ? (material.sourceFileL ?? [])
            .map((value) =>
              this.filesService.makeMediaUrl(value, userId, "attachment"),
            )
            .filter((value): value is string => value !== null)
        : [],
      cloudDiskLinkM: material.cloudDiskLinkM,
      cloudDiskLinkL: material.cloudDiskLinkL,
      cloudDiskLinkS: material.cloudDiskLinkS,
      plannerApprover: material.plannerApprover,
      designer: material.designer,
      publishTime: this.toIsoDate(material.publishTime),
      subscriber: material.subscriber ?? [],
      thumbLargeUrl: this.thumbnails.makeThumbUrl(
        this.primaryImage(material),
        userId,
        1200,
      ),
    };
  }

  private buildReceivedAtMap(receiveRows: UserReceiveRow[]): Map<string, string> {
    const receivedAt: Map<string, string> = new Map<string, string>();
    for (const row of receiveRows) {
      if (!row.downloadTime) continue;
      const downloadTimeIso: string = row.downloadTime.toISOString();
      for (const versionId of extractLinkRecordIds(row.version)) {
        if (!receivedAt.has(versionId)) {
          receivedAt.set(versionId, downloadTimeIso);
        }
      }
    }
    return receivedAt;
  }

  private async loadFamilyRows(
    material: MaterialAssetMainRow,
  ): Promise<FamilyMaterialRow[]> {
    if (!material.appMaterialId) {
      return [
        {
          baseRecordId: material.baseRecordId,
          appInternalMaterialId: material.appInternalMaterialId,
          releaseStatus: material.releaseStatus,
          versionStatus: material.versionStatus,
        },
      ];
    }
    return (await this.base.rows<MaterialAssetMainRow>("main"))
      .filter((row) => row.appMaterialId === material.appMaterialId)
      .map((row) => ({
        baseRecordId: row.baseRecordId,
        appInternalMaterialId: row.appInternalMaterialId,
        releaseStatus: row.releaseStatus,
        versionStatus: row.versionStatus,
      }));
  }

  private resolveBanner(
    material: MaterialAssetMainRow,
    familyRows: FamilyMaterialRow[],
    familyReceiveRows: UserReceiveRow[],
  ): VersionBanner | null {
    const hasReplacedRecord: boolean = familyReceiveRows.some(
      (row: UserReceiveRow): boolean => row.isReplacedNewVersion === true,
    );
    if (!hasReplacedRecord) return null;

    if (
      material.versionStatus === VERSION_STATUS.official &&
      material.releaseStatus === RELEASE_STATUS.published
    ) {
      return { mode: "currentVersion", newVersionMaterialId: null };
    }

    const replacement: FamilyMaterialRow | undefined = familyRows.find(
      (row: FamilyMaterialRow): boolean =>
        row.releaseStatus === RELEASE_STATUS.published &&
        row.versionStatus === VERSION_STATUS.official &&
        typeof row.baseRecordId === "string",
    );
    if (!replacement || !replacement.baseRecordId) return null;
    return { mode: "oldVersion", newVersionMaterialId: replacement.baseRecordId };
  }

  private validateEditFields(fields: MaterialEditFields): void {
    if (
      fields.material_name !== undefined &&
      typeof fields.material_name !== "string"
    ) {
      throw new BadRequestException("material_name 必须为字符串");
    }
    if (
      fields.is_recommended !== undefined &&
      typeof fields.is_recommended !== "boolean"
    ) {
      throw new BadRequestException("is_recommended 必须为布尔值");
    }
    if (
      fields.validity_period !== undefined &&
      (typeof fields.validity_period !== "number" ||
        !Number.isFinite(fields.validity_period))
    ) {
      throw new BadRequestException("validity_period 必须为数字（毫秒）");
    }
    if (
      fields.app_language !== undefined &&
      typeof fields.app_language !== "string"
    ) {
      throw new BadRequestException("app_language 必须为字符串");
    }
    if (fields.risk_label !== undefined && !isStringArray(fields.risk_label)) {
      throw new BadRequestException("risk_label 必须为字符串数组");
    }
    if (
      fields.applicable_region !== undefined &&
      !isStringArray(fields.applicable_region)
    ) {
      throw new BadRequestException("applicable_region 必须为字符串数组");
    }
  }

  async getMaterialFiles(
    userId: string,
    baseRecordId: string,
  ): Promise<MaterialFilesResponse> {
    const identity: Identity = await this.identityService.resolve(userId);

    const material = await this.base.rowById<MaterialAssetMainRow>(
      "main",
      baseRecordId,
    );
    if (!this.isMaterialVisible(material, identity)) {
      throw new NotFoundException("物料不存在");
    }

    const cloudLinks = {
      m: material.cloudFilesM ?? this.parseCloudDiskLinks(material.cloudDiskLinkM),
      l: material.cloudFilesL ?? this.parseCloudDiskLinks(material.cloudDiskLinkL),
      s: material.cloudFilesS ?? this.parseCloudDiskLinks(material.cloudDiskLinkS),
    };

    const files: DeliverableFile[] = [];
    const missing: Partial<Record<"M" | "L" | "S", string>> = {};

    this.assembleTierFiles({
      tier: "M",
      attachments: material.currentValidAttachment ?? [],
      cloudLinkRefs: cloudLinks.m,
      isLargeFile: material.isLargeFile ?? false,
      files,
      missing,
      missingReason: "这件物料暂无导出文件，可联系设计师上传",
      userId,
    });

    const canSeeSource = this.canSeeSourceFiles(identity);
    if (canSeeSource) {
      this.assembleTierFiles({
        tier: "L",
        attachments: material.sourceFileL ?? [],
        cloudLinkRefs: cloudLinks.l,
        isLargeFile: material.isLargeFile ?? false,
        files,
        missing,
        missingReason: "这件物料还没上传源文件，可联系设计师",
        userId,
      });
    }

    const sAttachments: string[] =
      (material.previewFileS ?? []).length > 0
        ? (material.previewFileS ?? [])
        : (material.coverImage ?? []);
    this.assembleTierFiles({
      tier: "S",
      attachments: sAttachments,
      cloudLinkRefs: cloudLinks.s,
      isLargeFile: material.isLargeFile ?? false,
      files,
      missing,
      missingReason: "这件物料暂无预览文件",
      userId,
    });

    const versionRows = (await this.base.rows<VersionRecordRow>("version"))
      .filter(
        (row) =>
          row.appInternalMaterialId === material.appInternalMaterialId,
      )
      .sort(
        (a, b) =>
          (b.createTime?.getTime() ?? 0) - (a.createTime?.getTime() ?? 0),
      );
    const versionNumber: string = versionRows[0]?.versionNumber ?? "";

    return {
      materialId: baseRecordId,
      versionNumber,
      files,
      ...(Object.keys(missing).length > 0 ? { missing } : {}),
    };
  }

  async getMaterialThumbnail(
    userId: string,
    baseRecordId: string,
    res: any,
  ): Promise<void> {
    const identity = await this.identityService.resolve(userId);
    const material = await this.base.rowById<MaterialAssetMainRow>(
      "main",
      baseRecordId,
    );
    if (!this.isMaterialVisible(material, identity)) {
      throw new NotFoundException("物料不存在");
    }

    const imageAttachments: string[] = [
      ...(material.previewFileS ?? []),
      ...(material.coverImage ?? []),
      ...(material.currentValidAttachment ?? []),
    ];

    const imageUrl: string | undefined = imageAttachments.find(
      (locator: string): boolean => {
        const lower = this.filesService.getAttachmentName(locator).toLowerCase();
        return /\.(png|jpg|jpeg|gif|webp|svg)$/u.test(lower);
      },
    );

    if (imageUrl) {
      try {
        await this.filesService.proxyDownload(imageUrl, res);
        return;
      } catch {
        // 降级到 404
      }
    }

    res.status(404).json({ error: "No thumbnail available" });
  }

  async getKitFiles(
    userId: string,
    productModel: string,
  ): Promise<KitFilesResponse> {
    const identity: Identity = await this.identityService.resolve(userId);

    const rows = (await this.base.rows<MaterialAssetMainRow>("main")).filter(
      (row) => row.productModel === productModel,
    );

    const visibleRows: MaterialAssetMainRow[] = rows.filter(
      (r: MaterialAssetMainRow): boolean => this.isMaterialVisible(r, identity),
    );

    const materials: Array<{
      materialId: string;
      materialName: string;
      materialType: string;
      previewUrl: string | null;
      files: DeliverableFile[];
      missing: Partial<Record<"M" | "L" | "S", string>>;
    } | null> = await Promise.all(
      visibleRows.map(
        async (
          row: MaterialAssetMainRow,
        ): Promise<{
          materialId: string;
          materialName: string;
          materialType: string;
          previewUrl: string | null;
          files: DeliverableFile[];
          missing: Partial<Record<"M" | "L" | "S", string>>;
        } | null> => {
          if (!row.baseRecordId) return null;
          try {
            const fileResp: MaterialFilesResponse =
              await this.getMaterialFiles(userId, row.baseRecordId);
            return {
              materialId: row.baseRecordId,
              materialName: row.materialName ?? "",
              materialType: row.materialType ?? "",
              previewUrl: this.filesService.makeMediaUrl(
                row.previewFileS?.[0] ?? row.coverImage?.[0],
                userId,
              ),
              files: fileResp.files,
              missing: fileResp.missing ?? {},
            };
          } catch {
            return null;
          }
        },
      ),
    );

    return {
      productModel,
      materials: materials.filter(
        (
          m: {
            materialId: string;
            materialName: string;
            materialType: string;
            previewUrl: string | null;
            files: DeliverableFile[];
            missing: Partial<Record<"M" | "L" | "S", string>>;
          } | null,
        ): m is NonNullable<typeof m> => m !== null,
      ),
    };
  }

  private assembleTierFiles(params: {
    tier: "M" | "L" | "S";
    attachments: string[];
    cloudLinkRefs: CloudFileRef[];
    isLargeFile: boolean;
    files: DeliverableFile[];
    missing: Partial<Record<"M" | "L" | "S", string>>;
    missingReason: string;
    userId: string;
  }): void {
    const {
      tier,
      attachments,
      cloudLinkRefs,
      isLargeFile,
      files,
      missing,
      missingReason,
      userId,
    } = params;

    const direct: DeliverableFile[] = [];
    for (const att of [...new Set(attachments)]) {
      const url = this.filesService.makeMediaUrl(att, userId, "attachment");
      if (url) direct.push({
        kind: tier, fileName: this.filesService.getAttachmentName(att),
        sizeBytes: null, mimeType: null, delivery: "direct", url,
        previewUrl: this.filesService.makeMediaUrl(att, userId),
      });
    }
    const merged = mergeCloudChannels(direct, cloudLinkRefs).map((file) => ({ ...file, kind: tier }));
    for (const file of merged) {
      if (isLargeFile && file.cloudCopyUrl) {
        file.url = file.cloudCopyUrl;
        file.delivery = "external";
        delete file.cloudCopyUrl;
      }
      files.push(file);
    }
    if (merged.length === 0) missing[tier] = missingReason;
  }

  private parseCloudDiskLinks(raw: string | null | undefined): CloudFileRef[] {
    if (!raw) return [];
    return raw
      .split("\n")
      .map((line: string): string => line.trim())
      .filter((line: string): boolean => line.length > 0)
      .map(
        (url: string): CloudFileRef => ({
          fileName: this.extractFileName(url),
          link: url,
          fileToken: "",
        }),
      );
  }

  private extractFileName(url: string): string {
    const attachmentName = this.filesService.getAttachmentName(url);
    if (attachmentName !== "download") return attachmentName;
    const tail: string | undefined = url
      .split("?")[0]
      ?.split("/")
      .pop();
    if (!tail) return url;
    try {
      return decodeURIComponent(tail);
    } catch {
      return tail;
    }
  }

  private toIsoDate(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null;
  }

  private canSeeSourceFiles(identity: Identity): boolean {
    return identity.roles.some((role) =>
      ["设计师", "策划", "维护者"].includes(role),
    );
  }
}
