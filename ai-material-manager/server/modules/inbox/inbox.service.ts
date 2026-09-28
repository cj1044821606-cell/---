import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Identity } from "@shared/identity";
import type { PoolProgress } from "@shared/pool";
import type {
  InboxCard,
  InboxCardField,
  InboxCardType,
  InboxResponse,
} from "@shared/inbox";
import {
  BITABLE_DEEP_LINK_HOST,
  buildBitableDeepLink,
} from "@server/common/utils/bitable-deep-link.util";
import {
  getBitableAppToken,
  INBOX_LIMIT,
  RELEASE_STATUS,
} from "@server/common/constants/bitable.constants";
import { extractLinkRecordIds } from "@server/common/utils/bitable-link.util";
import { IdentityService } from "@server/modules/identity/identity.service";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import {
  buildPoolProgressMap,
  type PoolProgressRowLike,
} from "@server/modules/pool/pool-progress.util";
import {
  AI_PROCESS_STATUS,
  CONFIRM_RESULT_WAITING,
  INBOX_DEEP_LINK_TABLES,
  INBOX_SOURCE_TABLE_NAMES,
  PROBLEM_STATUS_WAITING,
  REGION_AUDIT_STATUS_WAITING,
  STUCK_RETRY_THRESHOLD,
  type InboxSourceTable,
} from "./inbox.constants";

const DAY_MS: number = 86400000;

interface AiAskRow extends PoolProgressRowLike {
  originalFileName: string | null;
  uploadMethod: string | null;
  uploadTime: Date | null;
  missingInfo: string | null;
  updatedAt: Date;
  aiAskTarget: string | null;
}

interface ConfirmRecognizeRow extends PoolProgressRowLike {
  originalFileName: string | null;
  uploadTime: Date | null;
  aiRecognizeResult: string | null;
  updatedAt: Date;
  uploader: string | null;
  plannerAuditor: string | null;
}

interface ReturnedRow extends PoolProgressRowLike {
  originalFileName: string | null;
  uploadTime: Date | null;
  updatedAt: Date;
  uploader: string | null;
}

interface RecognizingRow extends PoolProgressRowLike {
  originalFileName: string | null;
  uploadTime: Date | null;
  updatedAt: Date;
  uploader: string | null;
  designer: string | null;
  plannerAuditor: string | null;
}

interface WaitPublishRow {
  baseRecordId: string | null;
  materialName: string | null;
  materialType: string | null;
  productModel: string | null;
  currentVersion: string | null;
  updatedAt: Date;
  plannerApprover: string | null;
}

interface PrereleaseMainRow extends Record<string, unknown> {
  baseRecordId: string | null;
  materialName: string | null;
  standardName: string | null;
  materialType: string | null;
  currentVersion: string | null;
  releaseStatus: string | null;
  plannerApprover: string | null;
  isPrerelease: boolean;
  reviewComment: string | null;
  updatedAt: Date;
}

interface PrereleaseVersionRow extends Record<string, unknown> {
  relatedMaterial: unknown;
  modifier: string | null;
}

/** 被驳回的预发布在上传者待办里保留的天数 */
const PRERELEASE_REJECTED_VISIBLE_DAYS = 14;

interface RegionAuditRow {
  baseRecordId: string | null;
  region: string | null;
  regionVersionNo: string | null;
  language: string | null;
  aiCompareSummary: string | null;
  updatedAt: Date;
}

interface VersionReplacedRow {
  baseRecordId: string | null;
  receiveRecord: string | null;
  region: string | null;
  downloadTime: Date | null;
  updatedAt: Date;
  receiveDownloadPerson: string | null;
  isReplacedNewVersion: boolean;
  isNotified: boolean;
  inAppReadAt: Date | null;
}

interface ProblemHandleRow {
  baseRecordId: string | null;
  problemTitle: string | null;
  problemType: string | null;
  severityLevel: string | null;
  problemDescription: string | null;
  updatedAt: Date;
  handler: string | null;
  processingStatus: string | null;
}

interface StuckRow extends PoolProgressRowLike {
  originalFileName: string | null;
  updatedAt: Date;
}

interface BuildCardParams {
  type: InboxCardType;
  titleKey: string;
  source: InboxSourceTable;
  baseRecordId: string;
  body: string | null;
  fields: Array<InboxCardField | null>;
  updatedAt: Date;
  nowMs: number;
  progress?: PoolProgress;
}

function buildInboxDeepLink(
  source: InboxSourceTable,
  recordId: string,
): string {
  const tableId: string | undefined = INBOX_DEEP_LINK_TABLES[source];
  if (!tableId) {
    return `${BITABLE_DEEP_LINK_HOST}/base/${getBitableAppToken()}`;
  }
  return buildBitableDeepLink(tableId, recordId);
}

@Injectable()
export class InboxService {
  private readonly logger: Logger = new Logger(InboxService.name);

  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly identityService: IdentityService,
  ) {}

  async listForUser(userId: string): Promise<InboxResponse> {
    const identity: Identity = await this.identityService.resolve(userId);
    const nowMs: number = Date.now();

    const queries: Array<Promise<InboxCard[]>> = [
      this.queryRecognizing(userId, nowMs),
      this.queryAiAsk(userId, nowMs),
      this.queryConfirmRecognize(userId, nowMs),
      this.queryReturned(userId, nowMs),
      this.queryWaitPublish(userId, nowMs),
      this.queryVersionReplaced(userId, nowMs),
      this.queryProblemHandle(userId, nowMs),
      this.queryPrereleaseReview(userId, nowMs),
      this.queryPrereleaseRejected(userId, nowMs),
    ];
    // 身份门控：regionAudit 仅 HQ 审核人查询；stuck 仅维护者查询
    if (identity.isHqAuditor) {
      queries.push(this.queryRegionAudit(nowMs));
    }
    if (identity.isMaintainer) {
      queries.push(this.queryStuck(nowMs));
    }

    const results: InboxCard[][] = await Promise.all(queries);
    const merged: InboxCard[] = results.flat();
    merged.sort((a: InboxCard, b: InboxCard) => b.waitingDays - a.waitingDays);
    const items: InboxCard[] = merged.slice(0, INBOX_LIMIT);
    this.logger.log(
      `Inbox aggregated user=${userId} total=${merged.length} returned=${items.length}`,
    );
    return { items };
  }

  async acknowledgeVersionReplaced(
    recordId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const row = await this.base.rowById<
      VersionReplacedRow & Record<string, unknown>
    >("receive", recordId, { force: true });
    if (
      row.receiveDownloadPerson !== userId ||
      row.isReplacedNewVersion !== true
    ) {
      throw new NotFoundException("Inbox item not found");
    }
    if (row.inAppReadAt === null) {
      await this.base.updateRecord("receive", recordId, {
        站内已读时间: Date.now(),
      });
    }
    return { success: true };
  }

  /** AI 追问：待补充 且 AI 提问对象是我 */
  private async queryAiAsk(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<AiAskRow & Record<string, unknown>>("pool")
    ).filter(
      (row) =>
        row.processStatus === AI_PROCESS_STATUS.needSupplement &&
        row.aiAskTarget === userId,
    );

    const progressMap: Map<string, PoolProgress> = await buildPoolProgressMap(
      this.base,
      rows,
    );
    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "aiAsk",
          titleKey: "inbox.aiAsk.title",
          source: "aiPendingPool",
          baseRecordId: row.baseRecordId,
          body: row.missingInfo,
          fields: [
            this.toField("inbox.field.originalFileName", row.originalFileName),
            this.toField("inbox.field.uploadMethod", row.uploadMethod),
            this.toField(
              "inbox.field.uploadTime",
              this.formatDate(row.uploadTime),
            ),
          ],
          updatedAt: row.updatedAt,
          nowMs,
          progress: progressMap.get(row.baseRecordId),
        }),
      );
    }
    return cards;
  }

  /** 识别确认：待确认 且 我是上传人或策划审核人 */
  private async queryConfirmRecognize(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<ConfirmRecognizeRow & Record<string, unknown>>(
        "pool",
      )
    ).filter(
      (row) =>
        row.processStatus === AI_PROCESS_STATUS.needConfirm &&
        row.confirmResult === CONFIRM_RESULT_WAITING &&
        (row.uploader === userId || row.plannerAuditor === userId),
    );

    const progressMap: Map<string, PoolProgress> = await buildPoolProgressMap(
      this.base,
      rows,
    );
    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "confirmRecognize",
          titleKey: "inbox.confirmRecognize.title",
          source: "aiPendingPool",
          baseRecordId: row.baseRecordId,
          body: row.aiRecognizeResult,
          fields: [
            this.toField("inbox.field.originalFileName", row.originalFileName),
            this.toField(
              "inbox.field.uploadTime",
              this.formatDate(row.uploadTime),
            ),
          ],
          updatedAt: row.updatedAt,
          nowMs,
          progress: progressMap.get(row.baseRecordId),
        }),
      );
    }
    return cards;
  }

  /** AI 识别中：待识别 且 我是上传人/设计师/策划人 */
  private async queryRecognizing(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<RecognizingRow & Record<string, unknown>>("pool")
    ).filter(
      (row) =>
        row.processStatus === AI_PROCESS_STATUS.pendingRecognize &&
        (row.uploader === userId ||
          row.designer === userId ||
          row.plannerAuditor === userId),
    );

    const progressMap: Map<string, PoolProgress> = await buildPoolProgressMap(
      this.base,
      rows,
    );
    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "recognizing",
          titleKey: "inbox.recognizing.title",
          source: "aiPendingPool",
          baseRecordId: row.baseRecordId,
          body: "AI 正在识别物料信息，请稍候",
          fields: [
            this.toField("inbox.field.originalFileName", row.originalFileName),
            this.toField(
              "inbox.field.uploadTime",
              this.formatDate(row.uploadTime),
            ),
          ],
          updatedAt: row.updatedAt,
          nowMs,
          progress: progressMap.get(row.baseRecordId),
        }),
      );
    }
    return cards;
  }

  /** 已退回：我是上传人 */
  private async queryReturned(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<ReturnedRow & Record<string, unknown>>("pool")
    ).filter(
      (row) =>
        row.processStatus === AI_PROCESS_STATUS.returned &&
        row.uploader === userId,
    );

    const progressMap: Map<string, PoolProgress> = await buildPoolProgressMap(
      this.base,
      rows,
    );
    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "returned",
          titleKey: "inbox.returned.title",
          source: "aiPendingPool",
          baseRecordId: row.baseRecordId,
          body: row.processLog,
          fields: [
            this.toField("inbox.field.originalFileName", row.originalFileName),
            this.toField(
              "inbox.field.uploadTime",
              this.formatDate(row.uploadTime),
            ),
          ],
          updatedAt: row.updatedAt,
          nowMs,
          progress: progressMap.get(row.baseRecordId),
        }),
      );
    }
    return cards;
  }

  /** 待发布：我是策划/审批人 */
  private async queryWaitPublish(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<
        WaitPublishRow & {
          releaseStatus: string | null;
        } & Record<string, unknown>
      >("main")
    ).filter(
      (row) =>
        row.releaseStatus === RELEASE_STATUS.waitPublish &&
        row.plannerApprover === userId,
    );

    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "waitPublish",
          titleKey: "inbox.waitPublish.title",
          source: "materialAssetMain",
          baseRecordId: row.baseRecordId,
          body: `《${row.materialName ?? ""}》等你点发布`,
          fields: [
            this.toField("inbox.field.materialName", row.materialName),
            this.toField("inbox.field.materialType", row.materialType),
            this.toField("inbox.field.productModel", row.productModel),
            this.toField("inbox.field.currentVersion", row.currentVersion),
          ],
          updatedAt: row.updatedAt,
          nowMs,
        }),
      );
    }
    return cards;
  }

  /** AI 助手预发布：我是策划人及审核人，等我点审核 */
  private async queryPrereleaseReview(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rows = (await this.base.rows<PrereleaseMainRow>("main")).filter(
      (row) =>
        row.isPrerelease &&
        row.releaseStatus === RELEASE_STATUS.published &&
        row.plannerApprover === userId,
    );
    return rows.flatMap((row) =>
      row.baseRecordId
        ? [
            this.buildCard({
              type: "prereleaseReview",
              titleKey: "inbox.prereleaseReview.title",
              source: "materialAssetMain",
              baseRecordId: row.baseRecordId,
              body: `《${row.materialName ?? ""}》已由 AI 助手预发布，请审核`,
              fields: [
                this.toField("inbox.field.standardName", row.standardName),
                this.toField("inbox.field.materialType", row.materialType),
                this.toField("inbox.field.currentVersion", row.currentVersion),
              ],
              updatedAt: row.updatedAt,
              nowMs,
            }),
          ]
        : [],
    );
  }

  /** 我通过 AI 助手预发布的物料被审核人驳回（按版本记录的修改人识别上传者） */
  private async queryPrereleaseRejected(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rejected = (await this.base.rows<PrereleaseMainRow>("main")).filter(
      (row) =>
        row.isPrerelease &&
        row.releaseStatus === RELEASE_STATUS.offline &&
        Boolean(row.reviewComment) &&
        nowMs - row.updatedAt.getTime() <
          PRERELEASE_REJECTED_VISIBLE_DAYS * DAY_MS,
    );
    if (rejected.length === 0) return [];
    const mine = new Set<string>();
    for (const version of await this.base.rows<PrereleaseVersionRow>("version")) {
      if (version.modifier !== userId) continue;
      for (const id of extractLinkRecordIds(version.relatedMaterial)) mine.add(id);
    }
    return rejected.flatMap((row) =>
      row.baseRecordId && mine.has(row.baseRecordId)
        ? [
            this.buildCard({
              type: "prereleaseRejected",
              titleKey: "inbox.prereleaseRejected.title",
              source: "materialAssetMain",
              baseRecordId: row.baseRecordId,
              body: row.reviewComment,
              fields: [
                this.toField("inbox.field.standardName", row.standardName),
                this.toField("inbox.field.currentVersion", row.currentVersion),
              ],
              updatedAt: row.updatedAt,
              nowMs,
            }),
          ]
        : [],
    );
  }

  /** 区域二创待审核：仅 HQ 审核人（调用方已门控） */
  private async queryRegionAudit(nowMs: number): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<
        RegionAuditRow & {
          auditStatus: string | null;
        } & Record<string, unknown>
      >("secondary")
    ).filter((row) => row.auditStatus === REGION_AUDIT_STATUS_WAITING);

    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "regionAudit",
          titleKey: "inbox.regionAudit.title",
          source: "regionSecondaryCreationRecord",
          baseRecordId: row.baseRecordId,
          body: row.aiCompareSummary,
          fields: [
            this.toField("inbox.field.region", row.region),
            this.toField("inbox.field.versionNo", row.regionVersionNo),
            this.toField("inbox.field.language", row.language),
          ],
          updatedAt: row.updatedAt,
          nowMs,
        }),
      );
    }
    return cards;
  }

  /** 版本被替代：我领的旧版已有新版且尚未在站内确认 */
  private async queryVersionReplaced(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<VersionReplacedRow & Record<string, unknown>>(
        "receive",
      )
    ).filter(
      (row) =>
        row.isReplacedNewVersion === true &&
        row.inAppReadAt === null &&
        row.receiveDownloadPerson === userId,
    );

    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "versionReplaced",
          titleKey: "inbox.versionReplaced.title",
          source: "downloadReceiveRecord",
          baseRecordId: row.baseRecordId,
          body: "你领的旧版已被新版替代",
          fields: [
            this.toField("inbox.field.receiveRecord", row.receiveRecord),
            this.toField("inbox.field.region", row.region),
            this.toField(
              "inbox.field.downloadTime",
              this.formatDate(row.downloadTime),
            ),
          ],
          updatedAt: row.updatedAt,
          nowMs,
        }),
      );
    }
    return cards;
  }

  /** 问题反馈待处理：我是处理人 */
  private async queryProblemHandle(
    userId: string,
    nowMs: number,
  ): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<ProblemHandleRow & Record<string, unknown>>(
        "feedback",
      )
    ).filter(
      (row) =>
        row.processingStatus === PROBLEM_STATUS_WAITING &&
        row.handler === userId,
    );

    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "problemHandle",
          titleKey: "inbox.problemHandle.title",
          source: "problemFeedback",
          baseRecordId: row.baseRecordId,
          body: row.problemDescription,
          fields: [
            this.toField("inbox.field.problemTitle", row.problemTitle),
            this.toField("inbox.field.problemType", row.problemType),
            this.toField("inbox.field.severityLevel", row.severityLevel),
          ],
          updatedAt: row.updatedAt,
          nowMs,
        }),
      );
    }
    return cards;
  }

  /** AI 处理卡住：失败且重试达到阈值，仅维护者（调用方已门控） */
  private async queryStuck(nowMs: number): Promise<InboxCard[]> {
    const rows = (
      await this.base.rows<StuckRow & Record<string, unknown>>("pool")
    ).filter(
      (row) =>
        row.processStatus === AI_PROCESS_STATUS.failed &&
        (row.retryCount ?? 0) >= STUCK_RETRY_THRESHOLD,
    );

    const progressMap: Map<string, PoolProgress> = await buildPoolProgressMap(
      this.base,
      rows,
    );
    const cards: InboxCard[] = [];
    for (const row of rows) {
      if (!row.baseRecordId) continue;
      cards.push(
        this.buildCard({
          type: "stuck",
          titleKey: "inbox.stuck.title",
          source: "aiPendingPool",
          baseRecordId: row.baseRecordId,
          body: row.processLog,
          fields: [
            this.toField("inbox.field.originalFileName", row.originalFileName),
            this.toField("inbox.field.retryCount", row.retryCount),
          ],
          updatedAt: row.updatedAt,
          nowMs,
          progress: progressMap.get(row.baseRecordId),
        }),
      );
    }
    return cards;
  }

  private buildCard(params: BuildCardParams): InboxCard {
    const fields: InboxCardField[] = params.fields
      .filter((field): field is InboxCardField => field !== null)
      .slice(0, 4);
    return {
      id: params.baseRecordId,
      type: params.type,
      titleKey: params.titleKey,
      sourceTable: INBOX_SOURCE_TABLE_NAMES[params.source],
      waitingDays: Math.floor(
        (params.nowMs - params.updatedAt.getTime()) / DAY_MS,
      ),
      body: params.body ?? "",
      fields,
      deepLink: buildInboxDeepLink(params.source, params.baseRecordId),
      recordId: params.baseRecordId,
      progress: params.progress,
    };
  }

  private toField(
    labelKey: string,
    value: string | number | null | undefined,
  ): InboxCardField | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return {
      labelKey,
      value: typeof value === "number" ? String(value) : value,
    };
  }

  private formatDate(value: Date | null): string | null {
    if (!value) return null;
    return value.toISOString().slice(0, 10);
  }
}
