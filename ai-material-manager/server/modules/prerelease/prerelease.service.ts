import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { RELEASE_STATUS } from "@server/common/constants/bitable.constants";
import { extractLinkRecordIds } from "@server/common/utils/bitable-link.util";
import {
  FeishuBaseGateway,
  type FeishuFieldValue,
} from "@server/modules/feishu/feishu-base.gateway";
import type { BaseTableKey } from "@server/modules/feishu/feishu-base.contracts";
import { IdentityService } from "@server/modules/identity/identity.service";
import {
  buildNamingPreview,
  type GuidedNamingInput,
  type NamingPreviewResult,
} from "@shared/naming";
import type {
  ApplicableRegion,
  ModifyReason,
  PrereleaseReviewResponse,
  ProductLine,
  RiskTag,
  UpdateVersionType,
} from "@shared/prerelease";

/** 与网页上传表单的“大文件”阈值一致 */
export const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024;
const AUDIT_STATUS = { pending: "待审核", approved: "通过", rejected: "退回" } as const;
const VERSION_STATUS_FORMAL = "正式版";
const RELEASE_AUDIENCE = ["区域营销", "区域销售"];
const OLD_VERSION_HANDLING = "已替代";
const MAX_NAME_SUFFIX = 99;

export interface UploadedFileRef {
  fileToken: string;
  size: number;
}

export interface PrereleasePlanInput {
  naming: GuidedNamingInput;
  replaceMaterialId?: string;
}

export interface PrereleasePlan {
  naming: NamingPreviewResult;
  /** 查重后的最终标准命名；命名信息不完整时为 null */
  standardName: string | null;
  nameConflict: boolean;
  replaces: {
    materialId: string;
    standardName: string;
    currentVersion: string;
    suggestedMinorVersion: string | null;
    suggestedMajorVersion: string | null;
  } | null;
}

export interface PrereleasePublishInput {
  naming: GuidedNamingInput;
  materialName: string;
  productLine?: ProductLine;
  regions: ApplicableRegion[];
  riskTags?: RiskTag[];
  allowExternalSend: boolean;
  recommended?: boolean;
  plannerAuditorId: string;
  designerId?: string;
  replaceMaterialId?: string;
  versionType?: UpdateVersionType;
  modifyReason?: ModifyReason;
  changeSummary?: string;
  releaseNote?: string;
  exportFiles: UploadedFileRef[];
  sourceFiles: UploadedFileRef[];
  previewFiles: UploadedFileRef[];
}

export interface PrereleasePublishResult {
  materialId: string;
  versionRecordId: string;
  releaseRecordId: string;
  standardName: string;
  version: string;
  replacedMaterialId: string | null;
}

interface MainRow extends Record<string, unknown> {
  baseRecordId: string;
  standardName: string | null;
  currentVersion: string | null;
  releaseStatus: string | null;
  plannerApprover: string | null;
  appMaterialId: string | null;
  appInternalMaterialId: string | null;
  isPrerelease: boolean;
}

interface VersionRow extends Record<string, unknown> {
  baseRecordId: string;
  relatedMaterial: unknown;
  isCurrentValid: boolean;
  auditStatus: string | null;
}

const CATEGORY_LABEL: Record<GuidedNamingInput["category"], string | null> = {
  product: "产品物料",
  brand: "品牌物料",
  // 主表暂无“展会物料”选项，按 TClaw 规则不强行归类
  expo: null,
};

/** V1.2 → 小改 V1.3 / 大改 V2.0；无法解析时返回 null */
export function suggestNextVersions(current: string | null): {
  minor: string | null;
  major: string | null;
} {
  const match = /^V?(\d+)\.(\d+)$/iu.exec(current?.trim() ?? "");
  if (!match) return { minor: null, major: null };
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return { minor: `V${major}.${minor + 1}`, major: `V${major + 1}.0` };
}

/** 标准命名查重：与已有物料重名时按 TClaw 规则在尾部追加 -02、-03… */
export function uniqueStandardName(
  preview: string,
  existing: Iterable<string | null>,
): { name: string; conflict: boolean } {
  const taken = new Set<string>();
  for (const value of existing) if (value) taken.add(value.trim());
  if (!taken.has(preview)) return { name: preview, conflict: false };
  for (let n = 2; n <= MAX_NAME_SUFFIX; n += 1) {
    const candidate = `${preview}-${String(n).padStart(2, "0")}`;
    if (!taken.has(candidate)) return { name: candidate, conflict: true };
  }
  throw new BadRequestException("同名物料过多，请调整命名信息");
}

/**
 * AI 助手快速通道：用户本机的 AI 完成识别命名与标记后，由服务端一次性写好
 * 主表 → 版本记录 → 发布记录，并以「已发布 + 预发布」上线，跳过 TClaw 轮询。
 * 策划人及审核人审核通过后清除预发布标记；驳回则下架并写明原因。
 */
@Injectable()
export class PrereleaseService {
  private readonly logger = new Logger(PrereleaseService.name);

  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly identity: IdentityService,
  ) {}

  async plan(input: PrereleasePlanInput): Promise<PrereleasePlan> {
    const naming = buildNamingPreview(input.naming);
    const old = input.replaceMaterialId
      ? await this.loadReplaceable(input.replaceMaterialId)
      : null;
    let standardName: string | null = null;
    let nameConflict = false;
    if (naming.complete) {
      const rows = await this.base.rows<MainRow>("main", { force: true });
      const unique = uniqueStandardName(
        naming.preview,
        rows.map((row) => row.standardName),
      );
      standardName = unique.name;
      nameConflict = unique.conflict;
    }
    const next = suggestNextVersions(old?.currentVersion ?? null);
    return {
      naming,
      standardName,
      nameConflict,
      replaces: old
        ? {
            materialId: old.baseRecordId,
            standardName: old.standardName ?? "",
            currentVersion: old.currentVersion ?? "",
            suggestedMinorVersion: next.minor,
            suggestedMajorVersion: next.major,
          }
        : null,
    };
  }

  async publish(
    userId: string,
    input: PrereleasePublishInput,
  ): Promise<PrereleasePublishResult> {
    const naming = buildNamingPreview(input.naming);
    if (!naming.complete) {
      throw new BadRequestException(
        `命名信息不完整，缺少：${naming.missing.join(", ")}`,
      );
    }
    if (input.exportFiles.length === 0) {
      throw new BadRequestException("至少需要一个导出件（M）");
    }
    if (input.regions.length === 0) {
      throw new BadRequestException("请至少选择一个适用区域");
    }
    const version = normalizeVersion(input.naming.version);
    const old = input.replaceMaterialId
      ? await this.loadReplaceable(input.replaceMaterialId)
      : null;
    if (old && normalizeVersion(old.currentVersion) === version) {
      throw new BadRequestException(
        `新版本号 ${version} 与旧版相同，请升级版本号（参考 plan_material 的建议）`,
      );
    }
    const oldVersionRecordId = old
      ? await this.findCurrentVersionRecord(old.baseRecordId)
      : null;

    const mainRows = await this.base.rows<MainRow>("main", { force: true });
    const { name: standardName } = uniqueStandardName(
      naming.preview,
      mainRows.map((row) => row.standardName),
    );
    const allFiles = [
      ...input.exportFiles,
      ...input.sourceFiles,
      ...input.previewFiles,
    ];
    const isLargeFile = allFiles.some((f) => f.size > LARGE_FILE_THRESHOLD);
    const created: Array<{ table: BaseTableKey; id: string }> = [];

    try {
      // ① 主表先以“待发布”建好：等版本/发布记录都连上后再置已发布，
      //    保证自动化 10（盖发布时间）、04（通知策划）、15（下架旧版）触发时数据齐全
      const mainFields: Record<string, FeishuFieldValue> = {
        物料名称: input.materialName.trim(),
        标准命名: standardName,
        物料类型: input.naming.materialType ?? "",
        适用区域: input.regions,
        当前版本: version,
        版本状态: VERSION_STATUS_FORMAL,
        发布状态: RELEASE_STATUS.waitPublish,
        预发布: true,
        是否允许外发: input.allowExternalSend,
        是否推荐使用: input.recommended === true,
        是否大文件: isLargeFile,
        当前有效附件: attachments(input.exportFiles),
        策划及审核人: this.base.userField([input.plannerAuditorId]),
        订阅者: this.base.userField([userId]),
      };
      const category = CATEGORY_LABEL[input.naming.category];
      if (category) mainFields["产品或品牌物料"] = category;
      if (input.productLine) mainFields["产品线"] = input.productLine;
      if (input.naming.productModel?.trim()) {
        mainFields["产品型号"] = input.naming.productModel.trim();
      }
      if (input.naming.language) mainFields["语言"] = input.naming.language;
      if (input.riskTags?.length) mainFields["风险标签"] = input.riskTags;
      if (input.sourceFiles.length) {
        mainFields["源文件(L)"] = attachments(input.sourceFiles);
      }
      if (input.previewFiles.length) {
        mainFields["预览文件(S)"] = attachments(input.previewFiles);
      }
      if (input.designerId) {
        mainFields["设计师"] = this.base.userField([input.designerId]);
      }
      if (old?.appMaterialId) mainFields["物料ID"] = old.appMaterialId;

      const materialId = await this.base.createRecord("main", mainFields);
      created.push({ table: "main", id: materialId });

      // ② 新物料：物料ID（稳定族 ID）= 本行自动编号的内部物料ID
      if (!old?.appMaterialId) {
        const row = await this.base.rowById<MainRow>("main", materialId, {
          force: true,
        });
        if (row.appInternalMaterialId) {
          await this.base.updateRecord("main", materialId, {
            物料ID: row.appInternalMaterialId,
          });
        }
      }

      // ③ 版本记录：审核状态=待审核 即“预发布”在版本维度的体现
      const versionFields: Record<string, FeishuFieldValue> = {
        版本号: version,
        版本类型: old ? (input.versionType ?? "小改") : "首版",
        版本状态: VERSION_STATUS_FORMAL,
        标准命名: standardName,
        本版附件: attachments(input.exportFiles),
        审核状态: AUDIT_STATUS.pending,
        是否当前有效: true,
        修改人: this.base.userField([userId]),
        关联物料: [materialId],
      };
      const modifyReason = input.modifyReason ?? (old ? undefined : "首次发布");
      if (modifyReason) versionFields["修改原因"] = modifyReason;
      if (input.sourceFiles.length) {
        versionFields["源文件(L)"] = attachments(input.sourceFiles);
      }
      if (input.previewFiles.length) {
        versionFields["预览文件(S)"] = attachments(input.previewFiles);
      }
      if (input.changeSummary?.trim()) {
        versionFields["AI对比摘要"] = input.changeSummary.trim();
      }
      if (oldVersionRecordId) versionFields["对比旧版本"] = [oldVersionRecordId];
      const versionRecordId = await this.base.createRecord(
        "version",
        versionFields,
      );
      created.push({ table: "version", id: versionRecordId });

      // ④ 发布记录
      const note = [
        input.releaseNote?.trim(),
        "（由 AI 助手预发布，待策划人及审核人审核）",
      ]
        .filter(Boolean)
        .join("\n");
      const releaseFields: Record<string, FeishuFieldValue> = {
        发布标题: `${standardName} 预发布`,
        发布人: this.base.userField([userId]),
        发布区域: input.regions,
        发布对象: RELEASE_AUDIENCE,
        发布说明: note,
        是否通知旧版废弃: old !== null,
        关联物料: [materialId],
        发布版本: [versionRecordId],
      };
      if (old) releaseFields["旧版本处理方式"] = OLD_VERSION_HANDLING;
      const releaseRecordId = await this.base.createRecord(
        "release",
        releaseFields,
      );
      created.push({ table: "release", id: releaseRecordId });

      // ⑤ 上线：已发布 + 预发布标记；版本替换时同时连上旧版，自动化 15 会立即下架旧版
      const goLive: Record<string, FeishuFieldValue> = {
        发布状态: RELEASE_STATUS.published,
      };
      if (old) goLive["替代的旧版本"] = [old.baseRecordId];
      await this.base.updateRecord("main", materialId, goLive);

      if (oldVersionRecordId) {
        await this.base
          .updateRecord("version", oldVersionRecordId, { 是否当前有效: false })
          .catch((error: unknown) =>
            this.logger.warn(
              `Mark old version not current failed: ${String(error)}`,
            ),
          );
      }

      this.logger.log(
        `Prerelease published: material=${materialId} version=${version} user=${userId} replaces=${old?.baseRecordId ?? "-"}`,
      );
      return {
        materialId,
        versionRecordId,
        releaseRecordId,
        standardName,
        version,
        replacedMaterialId: old?.baseRecordId ?? null,
      };
    } catch (error) {
      await this.rollback(created);
      throw error;
    }
  }

  async approve(
    userId: string,
    materialId: string,
  ): Promise<PrereleaseReviewResponse> {
    await this.loadReviewable(userId, materialId);
    // 能被审核通过的一定是“已发布”的预发布，从未被驳回，审核意见本就为空
    await this.base.updateRecord("main", materialId, { 预发布: false });
    await this.updatePendingVersions(materialId, {
      审核状态: AUDIT_STATUS.approved,
    });
    this.logger.log(`Prerelease approved: material=${materialId} by=${userId}`);
    return { success: true, materialId, result: "approved" };
  }

  async reject(
    userId: string,
    materialId: string,
    reasonRaw: string | undefined,
  ): Promise<PrereleaseReviewResponse> {
    const reason = reasonRaw?.trim() ?? "";
    if (!reason) throw new BadRequestException("驳回时必须填写原因");
    if (reason.length > 2000) {
      throw new BadRequestException("驳回原因过长（最多 2000 字）");
    }
    await this.loadReviewable(userId, materialId);
    // 预发布标记保留：配合“已下架 + 审核意见”在上传者待办里显示为“被驳回”
    await this.base.updateRecord("main", materialId, {
      发布状态: RELEASE_STATUS.offline,
      审核意见: reason,
    });
    await this.updatePendingVersions(materialId, {
      审核状态: AUDIT_STATUS.rejected,
      是否当前有效: false,
    });
    this.logger.log(`Prerelease rejected: material=${materialId} by=${userId}`);
    return { success: true, materialId, result: "rejected" };
  }

  /** 审核人（本条物料的策划及审核人）或维护者可审核 */
  async canReview(
    userId: string,
    row: { plannerApprover: string | null },
  ): Promise<boolean> {
    if (row.plannerApprover === userId) return true;
    return (await this.identity.resolve(userId)).isMaintainer;
  }

  private async loadReviewable(
    userId: string,
    materialId: string,
  ): Promise<MainRow> {
    let row: MainRow;
    try {
      row = await this.base.rowById<MainRow>("main", materialId, { force: true });
    } catch {
      throw new NotFoundException("物料不存在");
    }
    if (!row.isPrerelease || row.releaseStatus !== RELEASE_STATUS.published) {
      throw new BadRequestException("这条物料不是待审核的预发布状态");
    }
    if (!(await this.canReview(userId, row))) {
      throw new ForbiddenException("只有这条物料的策划人及审核人可以审核");
    }
    return row;
  }

  private async loadReplaceable(materialId: string): Promise<MainRow> {
    let row: MainRow;
    try {
      row = await this.base.rowById<MainRow>("main", materialId, { force: true });
    } catch {
      throw new NotFoundException("要替换的旧物料不存在");
    }
    if (row.releaseStatus !== RELEASE_STATUS.published) {
      throw new BadRequestException("只能替换当前“已发布”的物料");
    }
    return row;
  }

  private async findCurrentVersionRecord(
    materialId: string,
  ): Promise<string | null> {
    const rows = await this.base.rows<VersionRow>("version", { force: true });
    const current = rows.find(
      (row) =>
        row.isCurrentValid &&
        extractLinkRecordIds(row.relatedMaterial).includes(materialId),
    );
    return current?.baseRecordId ?? null;
  }

  private async updatePendingVersions(
    materialId: string,
    fields: Record<string, FeishuFieldValue>,
  ): Promise<void> {
    const rows = await this.base.rows<VersionRow>("version", { force: true });
    const targets = rows.filter(
      (row) =>
        row.auditStatus === AUDIT_STATUS.pending &&
        extractLinkRecordIds(row.relatedMaterial).includes(materialId),
    );
    for (const row of targets) {
      await this.base.updateRecord("version", row.baseRecordId, fields);
    }
  }

  private async rollback(
    created: Array<{ table: BaseTableKey; id: string }>,
  ): Promise<void> {
    for (const record of [...created].reverse()) {
      try {
        await this.base.deleteRecord(record.table, record.id);
      } catch (error) {
        this.logger.error(
          `Prerelease rollback failed table=${record.table} record=${record.id}: ${String(error)}`,
        );
      }
    }
  }
}

function attachments(files: UploadedFileRef[]): Array<{ file_token: string }> {
  return files.map((file) => ({ file_token: file.fileToken }));
}

function normalizeVersion(value: string | null | undefined): string {
  const trimmed = value?.trim().toUpperCase() ?? "";
  return /^\d+\.\d+$/u.test(trimmed) ? `V${trimmed}` : trimmed;
}
