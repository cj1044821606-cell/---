import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Identity } from "@shared/identity";
import type {
  FeedbackActionRequest,
  FeedbackActionResponse,
  ReceiveActionResponse,
  ReceiveBatchActionResponse,
  RetireActionRequest,
  RetireActionResponse,
  RestoreActionRequest,
  RestoreActionResponse,
  SubscribeActionResponse,
} from "@shared/material";
import { RECEIVE_REGION_DEFAULT, RELEASE_STATUS } from "@server/common/constants/bitable.constants";
import { extractLinkRecordIds } from "@server/common/utils/bitable-link.util";
import { IdentityService } from "@server/modules/identity/identity.service";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import {
  BitableWriteService,
  type MaterialMainLiveRecord,
} from "./bitable-write.service";

const RECEIVE_BATCH_LIMIT: number = 50;
const RETIRE_REASON_MAX_LENGTH: number = 200;
const PROBLEM_TITLE_MAX_LENGTH: number = 100;

const RETIRE_ROLES: string[] = ["审核人", "维护者", "设计师", "策划"];
const PROBLEM_TYPE_MAX_LENGTH: number = 50;
const PROBLEM_DESCRIPTION_MAX_LENGTH: number = 2000;
const SEVERITY_MAX_LENGTH: number = 20;
const DEFAULT_SEVERITY_LEVEL: string = "一般";

interface ReceiveOutcome {
  versionId: string;
  outcome: "created" | "skipped";
  materialName: string;
}

interface MaterialRow extends Record<string, unknown> {
  baseRecordId: string;
  appInternalMaterialId: string | null;
  materialName: string | null;
  releaseStatus: string | null;
  plannerApprover: string | null;
  designer: string | null;
  subscriber: string[];
}

interface VersionRow extends Record<string, unknown> {
  baseRecordId: string;
  appInternalMaterialId: string | null;
  isCurrentValid: boolean;
}

interface ReceiveRow extends Record<string, unknown> {
  receiveDownloadPerson: string | null;
  version: unknown;
}

interface RegionRow extends Record<string, unknown> {
  regionCode: string | null;
  region: string | null;
}

@Injectable()
export class ActionsService {
  private readonly logger: Logger = new Logger(ActionsService.name);

  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly identityService: IdentityService,
    private readonly bitableWriteService: BitableWriteService,
  ) {}

  async receive(
    userId: string,
    materialId: string,
  ): Promise<ReceiveActionResponse> {
    const outcome: ReceiveOutcome = await this.receiveInternal(
      userId,
      materialId,
    );
    return { success: true, versionId: outcome.versionId };
  }

  async receiveBatch(
    userId: string,
    materialIds: unknown[],
  ): Promise<ReceiveBatchActionResponse> {
    if (materialIds.length > RECEIVE_BATCH_LIMIT) {
      throw new BadRequestException(
        `批量领取一次最多支持 ${RECEIVE_BATCH_LIMIT} 个物料`,
      );
    }
    let created: number = 0;
    let skipped: number = 0;
    const items: Array<{
      materialId: string;
      materialName: string;
      ok: boolean;
    }> = [];
    for (const rawMaterialId of materialIds) {
      if (
        typeof rawMaterialId !== "string" ||
        rawMaterialId.trim().length === 0
      ) {
        skipped += 1;
        continue;
      }
      const materialId: string = rawMaterialId.trim();
      try {
        const outcome: ReceiveOutcome = await this.receiveInternal(
          userId,
          materialId,
        );
        if (outcome.outcome === "created") {
          created += 1;
        } else {
          skipped += 1;
        }
        items.push({
          materialId,
          materialName: outcome.materialName,
          ok: outcome.outcome === "created",
        });
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          skipped += 1;
          items.push({ materialId, materialName: "", ok: false });
          continue;
        }
        throw error;
      }
    }
    this.logger.log(
      `Receive batch finished: user=${userId} requested=${String(materialIds.length)} created=${String(created)} skipped=${String(skipped)}`,
    );
    return { created, skipped, items };
  }

  async subscribe(
    userId: string,
    materialId: string,
    subscribe: boolean,
  ): Promise<SubscribeActionResponse> {
    // 本地同步表有延迟：必须先实时读取多维表格 subscriber，再基于实时值写回
    const live: MaterialMainLiveRecord =
      await this.bitableWriteService.getMaterialMainRecord(materialId);
    const currentSubscribers: string[] = live.subscriber;
    const alreadySubscribed: boolean =
      currentSubscribers.includes(userId);

    if (subscribe === alreadySubscribed) {
      this.logger.log(
        `Subscribe unchanged (skip write): user=${userId} material=${materialId} subscribe=${String(subscribe)}`,
      );
      return { success: true };
    }

    const nextSubscribers: string[] = subscribe
      ? [...currentSubscribers, userId]
      : currentSubscribers.filter(
          (id: string): boolean => id !== userId,
        );

    await this.bitableWriteService.updateMaterialMainRecord(materialId, {
      subscriber: nextSubscribers,
    });
    this.logger.log(
      `Subscribe updated: user=${userId} material=${materialId} subscribe=${String(subscribe)} total=${String(nextSubscribers.length)}`,
    );
    return { success: true };
  }

  async retire(
    userId: string,
    input: RetireActionRequest,
  ): Promise<RetireActionResponse> {
    const materialId: string = (input.materialId ?? "").trim();
    if (materialId.length === 0) {
      throw new BadRequestException("materialId 不能为空");
    }
    const reason: string = (input.reason ?? "").trim();
    if (reason.length === 0) {
      throw new BadRequestException("下架原因不能为空");
    }
    if (reason.length > RETIRE_REASON_MAX_LENGTH) {
      throw new BadRequestException(
        `下架原因不能超过 ${RETIRE_REASON_MAX_LENGTH} 字`,
      );
    }

    const identity: Identity = await this.identityService.resolve(userId);

    const material = await this.base.rowById<MaterialRow>("main", materialId);

    const hasRole: boolean = RETIRE_ROLES.some(
      (role: string): boolean => identity.roles.includes(role as any),
    );
    const isOwner: boolean =
      (material.plannerApprover !== null &&
        material.plannerApprover === userId) ||
      (material.designer !== null && material.designer === userId);
    if (!hasRole && !isOwner) {
      throw new ForbiddenException("无下架权限");
    }

    if (material.releaseStatus === RELEASE_STATUS.offline) {
      this.logger.log(
        `Retire idempotent skip: user=${userId} material=${materialId}`,
      );
      return {
        success: true,
        subscriberCount: material.subscriber.length,
      };
    }

    await this.bitableWriteService.updateMaterialMainRecord(materialId, {
      releaseStatus: RELEASE_STATUS.offline,
    });

    this.logger.log(
      `Retire executed: user=${userId} material=${materialId} reason=${reason}`,
    );

    return {
      success: true,
      subscriberCount: material.subscriber.length,
    };
  }

  async restore(
    userId: string,
    input: RestoreActionRequest,
  ): Promise<RestoreActionResponse> {
    const materialId: string = (input.materialId ?? "").trim();
    if (materialId.length === 0) {
      throw new BadRequestException("materialId 不能为空");
    }
    const reason: string = (input.reason ?? "").trim();
    if (reason.length === 0) {
      throw new BadRequestException("上架原因不能为空");
    }
    if (reason.length > RETIRE_REASON_MAX_LENGTH) {
      throw new BadRequestException(
        `上架原因不能超过 ${RETIRE_REASON_MAX_LENGTH} 字`,
      );
    }

    const identity: Identity = await this.identityService.resolve(userId);

    const material = await this.base.rowById<MaterialRow>("main", materialId);

    const hasRole: boolean = RETIRE_ROLES.some(
      (role: string): boolean => identity.roles.includes(role as any),
    );
    const isOwner: boolean =
      (material.plannerApprover !== null &&
        material.plannerApprover === userId) ||
      (material.designer !== null && material.designer === userId);
    if (!hasRole && !isOwner) {
      throw new ForbiddenException("无上架权限");
    }

    if (material.releaseStatus !== RELEASE_STATUS.offline) {
      this.logger.log(
        `Restore idempotent skip: user=${userId} material=${materialId} status=${material.releaseStatus ?? "null"}`,
      );
      return {
        success: true,
        subscriberCount: material.subscriber.length,
      };
    }

    await this.bitableWriteService.updateMaterialMainRecord(materialId, {
      releaseStatus: RELEASE_STATUS.published,
    });

    this.logger.log(
      `Restore executed: user=${userId} material=${materialId} reason=${reason}`,
    );

    return {
      success: true,
      subscriberCount: material.subscriber.length,
    };
  }

  async feedback(
    userId: string,
    input: FeedbackActionRequest,
  ): Promise<FeedbackActionResponse> {
    const materialRecordId: string = (input.materialId ?? "").trim();
    if (materialRecordId.length === 0) {
      throw new BadRequestException("materialId 不能为空");
    }
    const problemTitle: string = (input.problemTitle ?? "").trim();
    const problemType: string = (input.problemType ?? "").trim();
    const problemDescription: string = (input.problemDescription ?? "").trim();
    if (problemTitle.length === 0) {
      throw new BadRequestException("问题标题不能为空");
    }
    if (problemType.length === 0) {
      throw new BadRequestException("问题类型不能为空");
    }
    if (problemDescription.length === 0) {
      throw new BadRequestException("问题描述不能为空");
    }

    const severityLevel: string =
      (input.severityLevel ?? "").trim() || DEFAULT_SEVERITY_LEVEL;
    const versionRecordId: string | undefined =
      typeof input.versionId === "string" && input.versionId.trim().length > 0
        ? input.versionId.trim()
        : undefined;

    const recordId: string =
      await this.bitableWriteService.createProblemFeedback({
        materialRecordId,
        versionRecordId,
        reporterUserId: userId,
        problemTitle: problemTitle.slice(0, PROBLEM_TITLE_MAX_LENGTH),
        problemType: problemType.slice(0, PROBLEM_TYPE_MAX_LENGTH),
        problemDescription: problemDescription.slice(
          0,
          PROBLEM_DESCRIPTION_MAX_LENGTH,
        ),
        severityLevel: severityLevel.slice(0, SEVERITY_MAX_LENGTH),
      });
    this.logger.log(
      `Problem feedback created: reporter=${userId} material=${materialRecordId} record=${recordId}`,
    );
    return { success: true };
  }

  /**
   * 单个领取：仅凭 materialId 在服务端解析当前有效版本。
   * 双重幂等：本地同步表领取记录 + 多维表格实时检索，任一命中即跳过写入。
   */
  private async receiveInternal(
    userId: string,
    materialId: string,
  ): Promise<ReceiveOutcome> {
    const material = await this.base.rowById<MaterialRow>("main", materialId);
    if (!material.appInternalMaterialId) {
      throw new NotFoundException("物料不存在");
    }
    const internalMaterialId: string = material.appInternalMaterialId;

    const version = (await this.base.rows<VersionRow>("version")).find(
      (row) =>
        row.appInternalMaterialId === internalMaterialId &&
        row.isCurrentValid === true,
    );
    if (!version?.baseRecordId) {
      throw new BadRequestException("暂无可领取的有效版本");
    }
    const versionRecordId: string = version.baseRecordId;

    // 幂等 1：本地同步表（version jsonb 防御解析）
    const localRows = (await this.base.rows<ReceiveRow>("receive")).filter(
      (row) => row.receiveDownloadPerson === userId,
    );
    const alreadyLocal: boolean = localRows.some(
      (row: { version: unknown }): boolean =>
        extractLinkRecordIds(row.version).includes(versionRecordId),
    );

    // 幂等 2：多维表格实时检索
    const receivedRemote: Set<string> =
      await this.bitableWriteService.findReceivedVersionRecordIds(userId);

    if (alreadyLocal || receivedRemote.has(versionRecordId)) {
      this.logger.log(
        `Receive skipped (already received): user=${userId} material=${materialId} version=${versionRecordId} localHit=${String(alreadyLocal)}`,
      );
      return {
        versionId: versionRecordId,
        outcome: "skipped",
        materialName: material.materialName ?? "",
      };
    }

    const identity: Identity = await this.identityService.resolve(userId);
    const region: string = await this.resolveReceiveRegion(identity.area);
    await this.bitableWriteService.createReceiveRecords({
      userId,
      region,
      items: [{ materialRecordId: materialId, versionRecordId }],
    });
    this.logger.log(
      `Receive created: user=${userId} material=${materialId} version=${versionRecordId} region=${region}`,
    );
    return {
      versionId: versionRecordId,
      outcome: "created",
      materialName: material.materialName ?? "",
    };
  }

  private async resolveReceiveRegion(area: string | null): Promise<string> {
    if (area === null) return RECEIVE_REGION_DEFAULT;
    const rows = await this.base.rows<RegionRow>("region");
    const region = rows.find((row) => row.regionCode === area)?.region ?? null;
    return region ?? area;
  }
}
