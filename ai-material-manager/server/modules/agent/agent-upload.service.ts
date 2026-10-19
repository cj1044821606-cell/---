import {
  BadRequestException,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import type { Request } from "express";
import { createHash } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import type { PoolUploadFileProgressResponse } from "@shared/api.interface";
import { FeishuUploadService } from "@server/modules/feishu/feishu-upload.service";
import { UploadIngressService } from "@server/modules/pool/upload-ingress.service";
import { AgentTicketService, type UploadTicket } from "./agent-ticket.service";

const MAX_REMEMBERED_HASHES = 2000;

export type AgentUploadResult =
  | {
      status: "receiving";
      taskId: string;
      chunkTotal: number;
      missingChunks: number[];
    }
  | {
      status: "accepted";
      taskId: string;
      message: string;
    };

/**
 * Agent 上传：凭证 URL + 整文件或分片 PUT。
 * 收齐后与网页上传走同一条链路（UPLOAD_DIR 暂存 → 后台分块传飞书 → 进度可查）。
 */
@Injectable()
export class AgentUploadService {
  private readonly logger = new Logger(AgentUploadService.name);
  /** 最后几片并发到达时只允许组装一次 */
  private readonly assembling = new Set<string>();
  /** 服务端对收齐文件计算的 SHA-256，供 AI 助手与本机文件比对 */
  private readonly receivedHashes = new Map<string, string>();

  constructor(
    private readonly tickets: AgentTicketService,
    private readonly ingress: UploadIngressService,
    private readonly uploads: FeishuUploadService,
  ) {}

  async receive(
    req: Request,
    ticketValue: string,
    chunkHeader: string | undefined,
  ): Promise<AgentUploadResult> {
    const ticket = this.tickets.verifyUpload(ticketValue);
    const taskId = ticket.uploadId;

    // 重复提交同一个凭证（例如 AI 助手重试）：已进入飞书上传阶段就直接返回任务号
    if (this.uploads.hasProgress(taskId)) {
      if (!this.uploads.getProgress(taskId, ticket.userId)) {
        throw new BadRequestException("上传任务不可用，请重新调用 prepare_upload");
      }
      return this.accepted(taskId);
    }

    this.assertRawBody(req);
    const chunkIndex = parseChunkIndex(chunkHeader);
    const received = await this.ingress.receiveDeclared(req, ticket.userId, {
      fileName: ticket.fileName,
      expectedSize: ticket.fileSize,
      uploadId: taskId,
      chunkIndex,
      chunkSize: this.tickets.chunkBytes,
    });

    let filePath = received.filePath;
    let fileSize = received.receivedSize;
    if (received.isChunked) {
      const missing = await this.ingress.missingChunks(
        taskId,
        received.chunkTotal,
      );
      if (missing.length > 0 || this.assembling.has(taskId)) {
        return {
          status: "receiving",
          taskId,
          chunkTotal: received.chunkTotal,
          missingChunks: missing,
        };
      }
      this.assembling.add(taskId);
      try {
        const assembled = await this.ingress.assemble(
          taskId,
          received.chunkTotal,
          ticket.fileSize,
        );
        filePath = assembled.filePath;
        fileSize = assembled.fileSize;
      } catch (error) {
        this.ingress.release(taskId);
        throw new BadRequestException(
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        this.assembling.delete(taskId);
      }
    }

    // 字节数对上不代表内容对：转存飞书前按本机 SHA-256 校验，避免把损坏/错拿的文件发布出去
    const sha256 = await sha256OfFile(filePath);
    if (ticket.sha256 && ticket.sha256 !== sha256) {
      await fs.unlink(filePath).catch(() => undefined);
      await this.ingress.finishStaging(taskId);
      this.logger.warn(
        `Agent upload hash mismatch: taskId=${taskId} expected=${ticket.sha256} actual=${sha256}`,
      );
      throw new BadRequestException(
        "文件内容校验失败：服务器收到的内容与本机 SHA-256 不一致，请重新调用 prepare_upload 后再传",
      );
    }
    this.receivedHashes.set(taskId, sha256);
    if (this.receivedHashes.size > MAX_REMEMBERED_HASHES) {
      const oldest = this.receivedHashes.keys().next().value;
      if (oldest) this.receivedHashes.delete(oldest);
    }

    await this.ingress.finishStaging(taskId);
    this.startFeishuUpload(ticket, filePath, fileSize);
    return this.accepted(taskId);
  }

  status(
    userId: string,
    taskId: string,
  ): (PoolUploadFileProgressResponse & { sha256?: string }) | undefined {
    const progress = this.uploads.getProgress(taskId, userId);
    if (!progress) return undefined;
    const sha256 = this.receivedHashes.get(taskId);
    return sha256 ? { ...progress, sha256 } : progress;
  }

  private startFeishuUpload(
    ticket: UploadTicket,
    filePath: string,
    fileSize: number,
  ): void {
    this.uploads
      .uploadFileFromPath(
        filePath,
        ticket.uploadId,
        ticket.fileName,
        fileSize,
        ticket.userId,
      )
      .catch((error: unknown) => {
        this.logger.warn(
          `Agent upload to Feishu failed: taskId=${ticket.uploadId} error=${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  private accepted(taskId: string): AgentUploadResult {
    return {
      status: "accepted",
      taskId,
      message:
        "文件已收到，正在转存到飞书。用 get_upload_status 查询，完成后即可 publish_material。",
    };
  }

  /** curl --data-binary 默认带表单类型，会被框架提前当表单解析掉，这里给出明确提示 */
  private assertRawBody(req: Request): void {
    const contentType = String(req.headers["content-type"] ?? "").toLowerCase();
    if (
      contentType.startsWith("application/x-www-form-urlencoded") ||
      contentType.startsWith("application/json") ||
      contentType.startsWith("multipart/")
    ) {
      throw new UnsupportedMediaTypeException(
        "请以原始字节上传：curl -T <文件> 或加 -H 'Content-Type: application/octet-stream'",
      );
    }
  }
}

function sha256OfFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

function parseChunkIndex(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const index = Number(value);
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new BadRequestException("X-Chunk-Index 必须是从 0 开始的整数");
  }
  return index;
}
