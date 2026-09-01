import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { extractLinkRecordIds } from "@server/common/utils/bitable-link.util";
import {
  FeishuBaseGateway,
  type FeishuFieldValue,
} from "@server/modules/feishu/feishu-base.gateway";

export interface ReceiveRecordWriteItem {
  materialRecordId: string;
  versionRecordId: string;
}

export interface MaterialMainLiveRecord {
  subscriber: string[];
  riskLabel: string[];
  applicableRegion: string[];
  validityPeriod: number | null;
  materialName: string | null;
  isRecommended: boolean | null;
  appLanguage: string | null;
}

export interface MaterialMainUpdateFields {
  materialName?: string;
  isRecommended?: boolean;
  validityPeriod?: number;
  riskLabel?: string[];
  appLanguage?: string;
  applicableRegion?: string[];
  subscriber?: string[];
  releaseStatus?: string;
}

export interface ProblemFeedbackWriteInput {
  materialRecordId: string;
  versionRecordId?: string;
  reporterUserId: string;
  problemTitle: string;
  problemType: string;
  problemDescription: string;
  severityLevel: string;
}

interface MaterialMainRow extends Record<string, unknown> {
  subscriber: string[];
  riskLabel: string[];
  applicableRegion: string[];
  validityPeriod: Date | null;
  materialName: string | null;
  isRecommended: boolean;
  appLanguage: string | null;
}

interface ReceiveRow extends Record<string, unknown> {
  receiveDownloadPerson: string | null;
  version: unknown;
}

@Injectable()
export class BitableWriteService {
  private readonly logger = new Logger(BitableWriteService.name);

  constructor(private readonly base: FeishuBaseGateway) {}

  async createReceiveRecords(params: {
    userId: string;
    region: string;
    items: ReceiveRecordWriteItem[];
  }): Promise<string[]> {
    if (params.items.length === 0) {
      throw new BadRequestException("No items to receive");
    }
    const ids: string[] = [];
    for (const item of params.items) {
      ids.push(
        await this.base.createRecord("receive", {
          "领取下载人": this.base.userField([params.userId]),
          "所属区域": params.region,
          "下载时间": Date.now(),
          "物料": [item.materialRecordId],
          "版本": [item.versionRecordId],
          "是否已被新版替代": false,
          "是否已通知": false,
        }),
      );
    }
    return ids;
  }

  async findReceivedVersionRecordIds(userId: string): Promise<Set<string>> {
    const rows = await this.base.rows<ReceiveRow>("receive", { force: true });
    const received = new Set<string>();
    for (const row of rows) {
      if (row.receiveDownloadPerson !== userId) continue;
      for (const id of extractLinkRecordIds(row.version)) received.add(id);
    }
    return received;
  }

  async getMaterialMainRecord(recordId: string): Promise<MaterialMainLiveRecord> {
    const row = await this.base.rowById<MaterialMainRow>("main", recordId, {
      force: true,
    });
    return {
      subscriber: row.subscriber,
      riskLabel: row.riskLabel,
      applicableRegion: row.applicableRegion,
      validityPeriod: row.validityPeriod?.getTime() ?? null,
      materialName: row.materialName,
      isRecommended: row.isRecommended,
      appLanguage: row.appLanguage,
    };
  }

  async updateMaterialMainRecord(
    recordId: string,
    fields: MaterialMainUpdateFields,
  ): Promise<string[]> {
    const record: Record<string, FeishuFieldValue> = {};
    if (fields.materialName !== undefined) record["物料名称"] = fields.materialName;
    if (fields.isRecommended !== undefined) record["是否推荐使用"] = fields.isRecommended;
    if (fields.validityPeriod !== undefined) record["有效期"] = fields.validityPeriod;
    if (fields.riskLabel !== undefined) record["风险标签"] = fields.riskLabel;
    if (fields.appLanguage !== undefined) record["语言"] = fields.appLanguage;
    if (fields.applicableRegion !== undefined) record["适用区域"] = fields.applicableRegion;
    if (fields.subscriber !== undefined) {
      record["订阅者"] = this.base.userField(fields.subscriber);
    }
    if (fields.releaseStatus !== undefined) record["发布状态"] = fields.releaseStatus;

    if (Object.keys(record).length === 0) {
      throw new BadRequestException("No fields to update");
    }
    return [await this.base.updateRecord("main", recordId, record)];
  }

  async createProblemFeedback(input: ProblemFeedbackWriteInput): Promise<string> {
    const record: Record<string, FeishuFieldValue> = {
      "问题标题": input.problemTitle,
      "问题类型": input.problemType,
      "问题描述": input.problemDescription,
      "严重程度": input.severityLevel,
      "处理状态": "待处理",
      "反馈人": this.base.userField([input.reporterUserId]),
      "关联物料": [input.materialRecordId],
    };
    if (input.versionRecordId) record["关联版本"] = [input.versionRecordId];
    const recordId = await this.base.createRecord("feedback", record);
    this.logger.log(`Problem feedback created in Base: record=${recordId}`);
    return recordId;
  }
}
