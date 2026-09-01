import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import {
  decodeAttachmentLocator,
  type AttachmentLocator,
} from "@server/common/utils/attachment-locator.util";
import { FeishuService } from "@server/modules/feishu/feishu.service";

interface MediaTokenPayload {
  fileToken: string;
  fileName: string;
  userId: string;
  disposition: "inline" | "attachment";
  exp: number;
}

const MEDIA_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly secret: string;

  constructor(
    private readonly feishu: FeishuService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>("SESSION_SECRET") ?? "";
  }

  makeMediaUrl(
    locatorValue: string | null | undefined,
    userId: string,
    disposition: "inline" | "attachment" = "inline",
  ): string | null {
    if (!locatorValue) return null;
    const locator = decodeAttachmentLocator(locatorValue);
    if (!locator) return null;
    const token = this.sign({
      ...locator,
      userId,
      disposition,
      exp: Date.now() + MEDIA_TOKEN_TTL_MS,
    });
    return `/api/files/download?token=${encodeURIComponent(token)}`;
  }

  getAttachmentName(locatorValue: string): string {
    return decodeAttachmentLocator(locatorValue)?.fileName ?? "download";
  }

  verifyMediaToken(token: string, currentUserId: string): MediaTokenPayload {
    const payload = this.verify(token);
    if (!payload || payload.exp < Date.now()) {
      throw new BadRequestException("下载链接无效或已过期");
    }
    if (payload.userId !== currentUserId) {
      throw new ForbiddenException("该下载链接不属于当前用户");
    }
    return payload;
  }

  async proxyToken(
    payload: MediaTokenPayload,
    res: any,
  ): Promise<void> {
    await this.proxyLocator(
      { fileToken: payload.fileToken, fileName: payload.fileName },
      res,
      payload.disposition,
    );
  }

  async proxyDownload(locatorValue: string, res: any): Promise<void> {
    const locator = decodeAttachmentLocator(locatorValue);
    if (!locator) {
      throw new BadRequestException("仅允许代理飞书 Base 附件");
    }
    await this.proxyLocator(locator, res, "inline");
  }

  private async proxyLocator(
    locator: AttachmentLocator,
    res: any,
    disposition: "inline" | "attachment",
  ): Promise<void> {
    const tenantToken = await this.feishu.getTenantAccessToken();
    const upstream = new URL(
      `https://open.feishu.cn/open-apis/drive/v1/medias/${encodeURIComponent(locator.fileToken)}/download`,
    );
    if (upstream.protocol !== "https:" || upstream.hostname !== "open.feishu.cn") {
      throw new BadRequestException("非法附件来源");
    }

    const response = await fetch(upstream, {
      headers: { Authorization: `Bearer ${tenantToken}` },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new Error(`Feishu media download failed: HTTP ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = response.headers.get("content-length");
    const encodedName = encodeURIComponent(locator.fileName).replace(/'/gu, "%27");
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodedName}`,
    );
    res.setHeader("Cache-Control", "private, max-age=300");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    if (!response.body) {
      res.end();
      return;
    }
    const nodeStream = Readable.fromWeb(response.body as any);
    nodeStream.pipe(res);
    await new Promise<void>((resolve, reject) => {
      nodeStream.on("end", resolve);
      nodeStream.on("error", reject);
    });
  }

  private sign(payload: MediaTokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", this.secret)
      .update(body)
      .digest("base64url");
    return `${body}.${signature}`;
  }

  private verify(token: string): MediaTokenPayload | null {
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra !== undefined) return null;
    const expected = createHmac("sha256", this.secret).update(body).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return null;
    }
    try {
      const payload = JSON.parse(
        Buffer.from(body, "base64url").toString("utf8"),
      ) as Partial<MediaTokenPayload>;
      if (
        typeof payload.fileToken !== "string" ||
        typeof payload.fileName !== "string" ||
        typeof payload.userId !== "string" ||
        typeof payload.exp !== "number" ||
        (payload.disposition !== "inline" && payload.disposition !== "attachment")
      ) {
        return null;
      }
      return payload as MediaTokenPayload;
    } catch (error) {
      this.logger.warn(`Invalid media token: ${String(error)}`);
      return null;
    }
  }
}
