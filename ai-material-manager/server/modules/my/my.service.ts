import { Injectable, Logger } from "@nestjs/common";
import type {
  MyHandledItem,
  MyHandledResponse,
  MyHandledRole,
  MyHandledStage,
  MyReceivedItem,
  MyReceivedResponse,
  MySubscribedItem,
  MySubscribedResponse,
  PoolRecordItem,
  PoolRecordRole,
} from "@shared/api.interface";
import { extractLinkRecordIds } from "@server/common/utils/bitable-link.util";
import { FilesService } from "@server/modules/files/files.service";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import {
  buildPoolProgressMap,
  type PoolProgressRowLike,
} from "@server/modules/pool/pool-progress.util";

interface MaterialRow extends Record<string, unknown> {
  baseRecordId: string;
  materialName: string | null;
  standardName: string | null;
  previewFileS: string[];
  coverImage: string[];
  currentVersion: string | null;
  releaseStatus: string | null;
  plannerApprover: string | null;
  designer: string | null;
  subscriber: string[];
  updatedAt: Date;
}

interface VersionRow extends Record<string, unknown> {
  baseRecordId: string;
  versionNumber: string | null;
}

interface ReceiveRow extends Record<string, unknown> {
  baseRecordId: string;
  receiveDownloadPerson: string | null;
  material: unknown;
  version: unknown;
  downloadTime: Date | null;
  isReplacedNewVersion: boolean;
}

interface MyPoolRow extends PoolProgressRowLike, Record<string, unknown> {
  baseRecordId: string;
  originalFileName: string | null;
  uploadTime: Date | null;
  uploader: string | null;
  designer: string | null;
  plannerAuditor: string | null;
  createdAt: Date;
}

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly files: FilesService,
  ) {}

  async getReceived(userId: string): Promise<MyReceivedResponse> {
    const rows = (await this.base.rows<ReceiveRow>("receive"))
      .filter((row) => row.receiveDownloadPerson === userId)
      .sort(
        (a, b) =>
          (b.downloadTime?.getTime() ?? 0) - (a.downloadTime?.getTime() ?? 0),
      );
    const materials = await this.base.rows<MaterialRow>("main");
    const versions = await this.base.rows<VersionRow>("version");
    const materialMap = new Map(
      materials.map((row) => [row.baseRecordId, row.materialName]),
    );
    const versionMap = new Map(
      versions.map((row) => [row.baseRecordId, row.versionNumber]),
    );

    const items: MyReceivedItem[] = rows.map((row) => {
      const materialId = extractLinkRecordIds(row.material)[0] ?? null;
      const versionId = extractLinkRecordIds(row.version)[0] ?? null;
      const materialName = materialId ? materialMap.get(materialId) : undefined;
      return {
        id: row.baseRecordId,
        downloadTime: row.downloadTime?.toISOString() ?? "",
        materialName: materialName ?? null,
        versionNo: versionId ? (versionMap.get(versionId) ?? null) : null,
        isReplacedNewVersion: row.isReplacedNewVersion,
        materialBaseRecordId:
          materialId && materialName !== undefined ? materialId : null,
      };
    });
    return { items };
  }

  async getSubscribed(userId: string): Promise<MySubscribedResponse> {
    const rows = (await this.base.rows<MaterialRow>("main"))
      .filter((row) => row.subscriber.includes(userId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const items: MySubscribedItem[] = rows.map((row) => ({
      baseRecordId: row.baseRecordId,
      materialName: row.materialName ?? "",
      standardName: row.standardName ?? "",
      previewUrl: this.files.makeMediaUrl(
        row.previewFileS[0] ?? row.coverImage[0],
        userId,
      ),
      currentVersion: row.currentVersion ?? "",
    }));
    return { items };
  }

  async getHandled(userId: string): Promise<MyHandledResponse> {
    const rows = (await this.base.rows<MaterialRow>("main"))
      .filter(
        (row) =>
          row.plannerApprover === userId || row.designer === userId,
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const items: MyHandledItem[] = rows.map((row) => {
      const role: MyHandledRole =
        row.plannerApprover === userId ? "planner" : "designer";
      return {
        baseRecordId: row.baseRecordId,
        materialName: row.materialName ?? "",
        stage: this.mapStage(row.releaseStatus),
        role,
      };
    });
    return { items, poolRecords: await this.getMyPoolRecords(userId) };
  }

  private async getMyPoolRecords(userId: string): Promise<PoolRecordItem[]> {
    const poolRows = (await this.base.rows<MyPoolRow>("pool"))
      .filter(
        (row) =>
          row.uploader === userId ||
          row.designer === userId ||
          row.plannerAuditor === userId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);
    const progressMap = await buildPoolProgressMap(this.base, poolRows);
    return poolRows.map((row) => {
      const role: PoolRecordRole =
        row.uploader === userId
          ? "uploader"
          : row.designer === userId
            ? "designer"
            : "planner";
      return {
        recordId: row.baseRecordId,
        originalFileName: row.originalFileName ?? "",
        uploadTime: row.uploadTime?.toISOString() ?? null,
        role,
        progress: progressMap.get(row.baseRecordId) ?? {
          stage: "recognizing",
          rejectReason: null,
        },
      };
    });
  }

  private mapStage(releaseStatus: string | null): MyHandledStage {
    if (releaseStatus === "待发布") return "waitPublish";
    if (releaseStatus === "已发布") return "published";
    if (releaseStatus === "已下架") return "offline";
    this.logger.warn(`未知 release_status: ${JSON.stringify(releaseStatus)}`);
    return "published";
  }
}
