import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import * as path from "node:path";
import { signPayload, verifyPayload } from "./signing";

const UPLOAD_PURPOSE = "agent-upload:v1";
const DOWNLOAD_PURPOSE = "agent-download:v1";
const UPLOAD_TICKET_TTL_MS = 2 * 60 * 60 * 1000;
const DOWNLOAD_TICKET_TTL_MS = 30 * 60 * 1000;
/** Cloudflare 单请求上限 100MB，分片留足余量 */
const DEFAULT_CHUNK_BYTES = 32 * 1024 * 1024;
const MAX_CHUNK_BYTES = 90 * 1024 * 1024;
const MIN_CHUNK_BYTES = 1024 * 1024;

export interface UploadTicket {
  userId: string;
  fileName: string;
  fileSize: number;
  uploadId: string;
  expiresAt: number;
}

interface UploadTicketPayload {
  uid: string;
  fn: string;
  sz: number;
  id: string;
  exp: number;
}

interface DownloadTicketPayload {
  uid: string;
  mt: string;
  exp: number;
}

/**
 * Agent 的上传/下载凭证：短时有效、绑定用户、自带签名，可以直接写在命令行 URL 里，
 * 这样 AI 助手用 curl 传文件时不需要接触长期有效的个人访问令牌。
 */
@Injectable()
export class AgentTicketService {
  private readonly secret: string;
  readonly chunkBytes: number;

  constructor(config: ConfigService) {
    this.secret = config.get<string>("SESSION_SECRET") ?? "";
    const configured = Number(config.get<string>("AGENT_UPLOAD_CHUNK_BYTES"));
    this.chunkBytes =
      Number.isSafeInteger(configured) &&
      configured >= MIN_CHUNK_BYTES &&
      configured <= MAX_CHUNK_BYTES
        ? configured
        : DEFAULT_CHUNK_BYTES;
  }

  issueUpload(
    userId: string,
    fileName: string,
    fileSize: number,
  ): { ticket: string; upload: UploadTicket } {
    const upload: UploadTicket = {
      userId,
      fileName: path.basename(fileName),
      fileSize,
      uploadId: `agent_${Date.now()}_${randomBytes(12).toString("hex")}`,
      expiresAt: Date.now() + UPLOAD_TICKET_TTL_MS,
    };
    const ticket = signPayload(this.secret, UPLOAD_PURPOSE, {
      uid: upload.userId,
      fn: upload.fileName,
      sz: upload.fileSize,
      id: upload.uploadId,
      exp: upload.expiresAt,
    } satisfies UploadTicketPayload);
    return { ticket, upload };
  }

  verifyUpload(ticket: string): UploadTicket {
    const payload = verifyPayload<UploadTicketPayload>(
      this.secret,
      UPLOAD_PURPOSE,
      ticket,
    );
    if (
      !payload ||
      typeof payload.uid !== "string" ||
      typeof payload.fn !== "string" ||
      typeof payload.id !== "string" ||
      !Number.isSafeInteger(payload.sz) ||
      payload.exp < Date.now()
    ) {
      throw new UnauthorizedException(
        "上传链接无效或已过期，请让 AI 助手重新调用 prepare_upload",
      );
    }
    return {
      userId: payload.uid,
      fileName: payload.fn,
      fileSize: payload.sz,
      uploadId: payload.id,
      expiresAt: payload.exp,
    };
  }

  chunkCount(fileSize: number): number {
    return Math.max(1, Math.ceil(fileSize / this.chunkBytes));
  }

  issueDownload(userId: string, mediaToken: string): string {
    return signPayload(this.secret, DOWNLOAD_PURPOSE, {
      uid: userId,
      mt: mediaToken,
      exp: Date.now() + DOWNLOAD_TICKET_TTL_MS,
    } satisfies DownloadTicketPayload);
  }

  verifyDownload(ticket: string): { userId: string; mediaToken: string } {
    const payload = verifyPayload<DownloadTicketPayload>(
      this.secret,
      DOWNLOAD_PURPOSE,
      ticket,
    );
    if (
      !payload ||
      typeof payload.uid !== "string" ||
      typeof payload.mt !== "string" ||
      payload.exp < Date.now()
    ) {
      throw new UnauthorizedException(
        "下载链接无效或已过期，请让 AI 助手重新获取文件列表",
      );
    }
    return { userId: payload.uid, mediaToken: payload.mt };
  }
}
