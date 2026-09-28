import { ForbiddenException, Injectable } from "@nestjs/common";
import type {
  OpsHealthItem,
  OpsOverdueItem,
  OpsQrAlert,
  OpsResponse,
  OpsStuckItem,
} from "@shared/ops";
import type { Identity } from "@shared/identity";
import type { SystemSettings } from "@shared/settings";
import { IdentityService } from "@server/modules/identity/identity.service";
import { SystemConfigService } from "@server/modules/settings/system-config.service";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";

const STUCK_RETRY_THRESHOLD: number = 3;
const OVERDUE_DAYS_THRESHOLD: number = 3;
const DAY_MS: number = 24 * 60 * 60 * 1000;

interface StuckRow {
  baseRecordId: string | null;
  originalFileName: string | null;
  retryCount: number | null;
  processLog: string | null;
}

interface PendingConfirmRow {
  baseRecordId: string | null;
  originalFileName: string | null;
  updatedAt: Date;
}

@Injectable()
export class OpsService {
  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly identityService: IdentityService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async getOps(userId: string): Promise<OpsResponse> {
    const identity: Identity = await this.identityService.resolve(userId);
    if (identity.isMaintainer !== true) {
      throw new ForbiddenException("仅维护者可查看运维视图");
    }

    const [stuck, overdueConfirm, health]: [
      OpsStuckItem[],
      OpsOverdueItem[],
      OpsHealthItem[],
    ] = await Promise.all([
      this.findStuck(),
      this.findOverdueConfirm(),
      this.buildHealth(),
    ]);
    const qrAlert: OpsQrAlert = await this.buildQrAlert(userId);

    return { stuck, overdueConfirm, qrAlert, health };
  }

  private async findStuck(): Promise<OpsStuckItem[]> {
    const rows = (await this.base.rows<(StuckRow & {
      processStatus: string | null;
    }) & Record<string, unknown>>("pool")).filter(
      (row) =>
        row.processStatus === "失败" &&
        (row.retryCount ?? 0) >= STUCK_RETRY_THRESHOLD,
    );

    return rows.map((row: StuckRow): OpsStuckItem => ({
      id: row.baseRecordId ?? "",
      originalFileName: row.originalFileName ?? "",
      retryCount: row.retryCount ?? 0,
      processLog: row.processLog,
    }));
  }

  private async findOverdueConfirm(): Promise<OpsOverdueItem[]> {
    const now: number = Date.now();
    const rows = (await this.base.rows<(PendingConfirmRow & {
      processStatus: string | null;
    }) & Record<string, unknown>>("pool")).filter(
      (row) => row.processStatus === "待确认",
    );

    const items: OpsOverdueItem[] = rows
      .map((row: PendingConfirmRow): OpsOverdueItem => ({
        id: row.baseRecordId ?? "",
        originalFileName: row.originalFileName ?? "",
        waitingDays: Math.floor((now - row.updatedAt.getTime()) / DAY_MS),
      }))
      .filter(
        (item: OpsOverdueItem): boolean =>
          item.waitingDays >= OVERDUE_DAYS_THRESHOLD,
      );

    items.sort(
      (a: OpsOverdueItem, b: OpsOverdueItem): number =>
        b.waitingDays - a.waitingDays,
    );
    return items;
  }

  private async buildQrAlert(userId: string): Promise<OpsQrAlert> {
    const settings: SystemSettings =
      await this.systemConfigService.getSettings(userId);
    return { status: settings.groupQrStatus, expiry: settings.groupQrExpiry };
  }

  private async buildHealth(): Promise<OpsHealthItem[]> {
    const [materials, pool, feedback] = await Promise.all([
      this.base.rows<{
        releaseStatus: string | null;
      } & Record<string, unknown>>("main"),
      this.base.rows<{
        processStatus: string | null;
      } & Record<string, unknown>>("pool"),
      this.base.rows<{
        processingStatus: string | null;
      } & Record<string, unknown>>("feedback"),
    ]);

    return [
      { key: "materialTotal", value: String(materials.length) },
      {
        key: "materialPublished",
        value: String(materials.filter((row) => row.releaseStatus === "已发布").length),
      },
      { key: "aiPendingTotal", value: String(pool.length) },
      { key: "failedPending", value: String(pool.filter((row) => row.processStatus === "失败").length) },
      { key: "feedbackPending", value: String(feedback.filter((row) => row.processingStatus === "待处理").length) },
    ];
  }
}
