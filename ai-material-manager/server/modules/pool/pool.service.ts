import { Injectable, Logger } from "@nestjs/common";
import type {
  PoolActionResponse,
  PoolConfirmAction,
  PoolOldVersionResponse,
  PoolUploadRequest,
  PoolUploadResponse,
} from "@shared/api.interface";
import {
  FeishuBaseGateway,
  type FeishuFieldValue,
} from "@server/modules/feishu/feishu-base.gateway";

/** 池「处理状态」写入值（与多维表格选项一致） */
const PROCESS_STATUS_PENDING_RECOGNIZE = "待识别";
const PROCESS_STATUS_RETURNED = "已退回";
const CONFIRM_RESULT_PASS = "通过";
const CONFIRM_RESULT_RETURN = "退回";
const UPLOAD_METHOD_FRONTEND = "前端上传";

function formatLogTime(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

/**
 * AI 待处理池写入服务（B 块）：
 * - reply：AI 追问就地回答，三字段同写，漏写处理锁会让轮询永远跳过
 * - confirm：确认卡三按钮写回
 * - upload：前端上传写池（兜底方案：云盘链接字段承载文件，TClaw 自取）
 */
@Injectable()
export class PoolService {
  private readonly logger: Logger = new Logger(PoolService.name);

  constructor(private readonly base: FeishuBaseGateway) {}

  async reply(recordId: string, reply: string): Promise<PoolActionResponse> {
    await this.updateRecord(recordId, {
      "用户补充回复": reply,
      "处理状态": PROCESS_STATUS_PENDING_RECOGNIZE,
      "处理锁": false,
    });
    this.logger.log(`Pool reply written: record=${recordId}`);
    return { success: true };
  }

  async confirm(
    recordId: string,
    action: PoolConfirmAction,
    reason?: string,
  ): Promise<PoolActionResponse> {
    let record: Record<string, FeishuFieldValue>;
    if (action === "publish") {
      record = {
        "确认结果": CONFIRM_RESULT_PASS,
        "确认后自动发布": true,
      };
    } else if (action === "store") {
      record = {
        "确认结果": CONFIRM_RESULT_PASS,
        "确认后自动发布": false,
      };
    } else {
      const existingLog: string = await this.readProcessLog(recordId);
      const entry: string = `[${formatLogTime(new Date())}] ${reason ?? ""}`;
      record = {
        "确认结果": CONFIRM_RESULT_RETURN,
        "处理状态": PROCESS_STATUS_RETURNED,
        "处理日志": existingLog ? `${existingLog}\n${entry}` : entry,
      };
    }
    await this.updateRecord(recordId, record);
    this.logger.log(`Pool confirm written: record=${recordId} action=${action}`);
    return { success: true };
  }

  async upload(
    params: PoolUploadRequest,
    userId: string,
  ): Promise<PoolUploadResponse> {
    const record: Record<string, FeishuFieldValue> = {
      "原始文件名": params.originalFileName,
      "上传方式": UPLOAD_METHOD_FRONTEND,
      "上传者": this.base.userField([userId]),
      "处理状态": PROCESS_STATUS_PENDING_RECOGNIZE,
      "处理锁": false,
      // 附件字段写 file_token 对象数组
      "上传文件（M）": params.uploadFileM.map((t) => ({ file_token: t })),
    };
    if (params.sourceFileL && params.sourceFileL.length > 0) {
      record["源文件(L)"] = params.sourceFileL.map((t) => ({ file_token: t }));
    }
    if (params.previewFileS && params.previewFileS.length > 0) {
      record["预览文件（S）"] = params.previewFileS.map((t) => ({ file_token: t }));
    }
    if (params.designBrief) {
      record["设计Brief"] = params.designBrief;
    }
    if (params.note) {
      record["用户填写说明"] = params.note;
    }
    if (params.plannerAuditorIds && params.plannerAuditorIds.length > 0) {
      // 人员字段统一写飞书 open_id。
      record["策划人及审核人"] = this.base.userField(params.plannerAuditorIds);
    }
    if (params.designerId) {
      record["设计师"] = this.base.userField([params.designerId]);
    }
    if (params.isVersionReplace) {
      record["是否为版本替换"] = true;
    }
    if (params.isLargeFile) {
      record["是否大文件"] = true;
    }
    if (params.associateOldVersionId) {
      // One-way link 字段写入格式：记录 ID 数组
      record["关联旧版本"] = [params.associateOldVersionId];
    }

    const newId = await this.base.createRecord("pool", record);
    this.logger.log(`Pool upload created: record=${newId} user=${userId}`);
    return { recordId: newId };
  }

  async listOldVersions(
    keyword: string | undefined,
  ): Promise<PoolOldVersionResponse> {
    const kw: string = (keyword ?? "").trim();
    const rows = (await this.base.rows<{
      baseRecordId: string;
      standardNaming: string | null;
      versionNumber: string | null;
      createTime: Date | null;
    } & Record<string, unknown>>("version"))
      .filter((row) => {
        if (!kw) return true;
        const haystack = `${row.standardNaming ?? ""} ${row.versionNumber ?? ""}`.toLowerCase();
        return haystack.includes(kw.toLowerCase());
      })
      .sort((a, b) => (b.createTime?.getTime() ?? 0) - (a.createTime?.getTime() ?? 0))
      .slice(0, 20);

    return {
      items: rows
        .filter((row) => Boolean(row.baseRecordId))
        .map((row) => ({
          baseRecordId: row.baseRecordId as string,
          label: row.standardNaming
            ? `${row.standardNaming}${row.versionNumber ? ` ${row.versionNumber}` : ""}`
            : row.versionNumber ?? "",
        })),
    };
  }

  /** 读现有处理日志，退回时追加而非覆盖 */
  private async readProcessLog(recordId: string): Promise<string> {
    try {
      const row = await this.base.rowById<{
        processLog: string | null;
      } & Record<string, unknown>>("pool", recordId, { force: true });
      return row.processLog ?? "";
    } catch (error) {
      this.logger.warn(
        `Read process log failed, fallback to overwrite: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return "";
    }
  }

  private async updateRecord(
    recordId: string,
    record: Record<string, FeishuFieldValue>,
  ): Promise<void> {
    await this.base.updateRecord("pool", recordId, record);
  }
}
