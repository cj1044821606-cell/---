import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  decodeAttachmentLocator,
  type AttachmentLocator,
} from "@server/common/utils/attachment-locator.util";
import { FilesService } from "./files.service";
import { PdfPreviewService } from "./pdf-preview.service";

/**
 * 物料预览缩略图：原图只从飞书下载一次，压成小尺寸 WebP 落盘，之后一直复用。
 *
 * - 缓存键 = 飞书 file_token。附件换新版本时 file_token 必然变化，
 *   所以“除非版本更新，否则一直用同一张缩略图”是天然成立的，无需手动失效。
 * - URL 不带过期时间，同一用户看同一张图时 URL 永远不变，
 *   浏览器可以按 immutable 长缓存，二次打开物料库零网络请求。
 * - 签名仍绑定当前登录用户，避免拿到 URL 的其他人或未登录请求直接访问。
 */

export const THUMB_WIDTHS = [480, 1200] as const;
export type ThumbWidth = (typeof THUMB_WIDTHS)[number];
export const DEFAULT_THUMB_WIDTH: ThumbWidth = 480;

interface ThumbTokenPayload {
  f: string;
  n: string;
  u: string;
}

export type ThumbResult =
  | { kind: "file"; filePath: string; etag: string }
  | { kind: "none" };

const TOKEN_PURPOSE = "thumb:v1:";
/** 原图超过此大小不做缩略图，避免 VM 内存被单张超大文件占满 */
const MAX_SOURCE_BYTES = 80 * 1024 * 1024;
/** 原图无法解码/过大时的负缓存有效期，到期后允许重试 */
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000;
/** 飞书下载失败（限流、网络抖动）只短暂退避，不写入磁盘负缓存 */
const TRANSIENT_BACKOFF_MS = 60 * 1000;
const MAX_CONCURRENT_JOBS = 3;
/** 预热最多占用的并发，给用户实时请求留出余量 */
const MAX_WARM_JOBS = 2;
const MAX_WARM_QUEUE = 800;
const WEBP_QUALITY: Record<ThumbWidth, number> = { 480: 70, 1200: 78 };

@Injectable()
export class ThumbnailService implements OnModuleInit {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly secret: string;
  private readonly cacheDir: string;
  private readonly ready = new Set<string>();
  private readonly transientUntil = new Map<string, number>();
  private readonly inFlight = new Map<string, Promise<ThumbResult>>();
  private readonly warmQueue: Array<{ locator: AttachmentLocator; width: ThumbWidth }> = [];
  private readonly warmQueued = new Set<string>();
  private running = 0;
  private warmActive = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(
    private readonly files: FilesService,
    config: ConfigService,
    private readonly pdf: PdfPreviewService,
  ) {
    this.secret = config.get<string>("SESSION_SECRET") ?? "";
    const uploadDir =
      config.get<string>("UPLOAD_DIR") ?? path.resolve("var/uploads");
    this.cacheDir =
      config.get<string>("THUMB_CACHE_DIR") ?? path.join(uploadDir, "thumbs");
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await this.pdf.cleanupInterrupted(this.cacheDir);
  }

  /** 生成稳定的缩略图 URL；非飞书附件返回 null */
  makeThumbUrl(
    locatorValue: string | null | undefined,
    userId: string,
    width: ThumbWidth = DEFAULT_THUMB_WIDTH,
  ): string | null {
    if (!locatorValue) return null;
    const locator = decodeAttachmentLocator(locatorValue);
    if (!locator || !isPreviewable(locator.fileName)) return null;
    const token = this.sign({ f: locator.fileToken, n: locator.fileName, u: userId });
    return `/api/files/thumb?token=${encodeURIComponent(token)}&w=${width}`;
  }

  verifyToken(token: string, currentUserId: string): AttachmentLocator {
    const payload = this.verify(token);
    if (!payload) throw new BadRequestException("缩略图链接无效");
    if (payload.u !== currentUserId) {
      throw new ForbiddenException("该缩略图链接不属于当前用户");
    }
    return { fileToken: payload.f, fileName: payload.n };
  }

  parseWidth(raw: string | undefined): ThumbWidth {
    const value = Number.parseInt(raw ?? "", 10);
    return (THUMB_WIDTHS as readonly number[]).includes(value)
      ? (value as ThumbWidth)
      : DEFAULT_THUMB_WIDTH;
  }

  /** 读取缩略图，没有就立即生成（同一张图并发请求只生成一次） */
  async get(locator: AttachmentLocator, width: ThumbWidth): Promise<ThumbResult> {
    const key = this.cacheKey(locator.fileToken, width);
    const cached = await this.lookup(key);
    if (cached) return cached;

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const job = this.withSlot(() => this.generate(locator, width, key)).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, job);
    return job;
  }

  /**
   * 后台预热：物料列表返回后，把还没有缩略图的预览图排队生成，
   * 让用户滚动到那里之前缩略图就已经准备好。不阻塞当前请求。
   */
  warm(locatorValues: Array<string | null | undefined>, width: ThumbWidth = DEFAULT_THUMB_WIDTH): void {
    for (const value of locatorValues) {
      if (this.warmQueue.length >= MAX_WARM_QUEUE) break;
      if (!value) continue;
      const locator = decodeAttachmentLocator(value);
      if (!locator || !isPreviewable(locator.fileName)) continue;
      const key = this.cacheKey(locator.fileToken, width);
      if (this.ready.has(key) || this.inFlight.has(key) || this.warmQueued.has(key)) {
        continue;
      }
      this.warmQueued.add(key);
      this.warmQueue.push({ locator, width });
    }
    this.drainWarmQueue();
  }

  createReadStream(filePath: string): NodeJS.ReadableStream {
    return createReadStream(filePath);
  }

  private drainWarmQueue(): void {
    while (this.warmActive < MAX_WARM_JOBS && this.warmQueue.length > 0) {
      const next = this.warmQueue.shift();
      if (!next) break;
      const key = this.cacheKey(next.locator.fileToken, next.width);
      this.warmActive += 1;
      void this.get(next.locator, next.width)
        .catch((error: unknown) => {
          this.logger.warn(`Thumbnail warm failed: ${String(error)}`);
        })
        .finally(() => {
          this.warmActive -= 1;
          this.warmQueued.delete(key);
          this.drainWarmQueue();
        });
    }
  }

  private async lookup(key: string): Promise<ThumbResult | null> {
    const filePath = this.filePath(key, "webp");
    if (this.ready.has(key)) return { kind: "file", filePath, etag: key };
    const backoff = this.transientUntil.get(key);
    if (backoff !== undefined) {
      if (backoff > Date.now()) return { kind: "none" };
      this.transientUntil.delete(key);
    }
    try {
      await fs.access(filePath);
      this.ready.add(key);
      return { kind: "file", filePath, etag: key };
    } catch {
      // 没有成品，再看是否处于负缓存
    }
    try {
      const stat = await fs.stat(this.filePath(key, "none"));
      if (Date.now() - stat.mtimeMs < NEGATIVE_TTL_MS) return { kind: "none" };
    } catch {
      // 无负缓存
    }
    return null;
  }

  private async generate(
    locator: AttachmentLocator,
    width: ThumbWidth,
    key: string,
  ): Promise<ThumbResult> {
    const target = this.filePath(key, "webp");
    let response: Response;
    try {
      response = await this.files.fetchUpstream(locator.fileToken, 45_000);
    } catch (error: unknown) {
      this.logger.warn(`Thumbnail source download failed (${key}): ${String(error)}`);
      this.transientUntil.set(key, Date.now() + TRANSIENT_BACKOFF_MS);
      return { kind: "none" };
    }
    try {
      const length = Number(response.headers.get("content-length") ?? "0");
      if (length > MAX_SOURCE_BYTES) {
        await response.body?.cancel().catch(() => undefined);
        return this.markNone(key, `source too large (${length} bytes)`);
      }
      const source = /\.pdf$/i.test(locator.fileName)
        ? await this.pdf.render(response, width, this.cacheDir)
        : Buffer.from(await response.arrayBuffer());
      if (source.byteLength > MAX_SOURCE_BYTES) {
        return this.markNone(key, `source too large (${source.byteLength} bytes)`);
      }

      const output = await sharp(source, { failOn: "none", animated: false })
        .rotate()
        .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY[width], effort: 4 })
        .toBuffer();

      const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, output);
      await fs.rename(tmp, target);
      this.ready.add(key);
      return { kind: "file", filePath: target, etag: key };
    } catch (error: unknown) {
      return this.markNone(key, String(error));
    }
  }

  private async markNone(key: string, reason: string): Promise<ThumbResult> {
    this.logger.warn(`Thumbnail unavailable (${key}): ${reason}`);
    await fs.writeFile(this.filePath(key, "none"), reason.slice(0, 500)).catch(
      () => undefined,
    );
    return { kind: "none" };
  }

  private async withSlot<T>(task: () => Promise<T>): Promise<T> {
    while (this.running >= MAX_CONCURRENT_JOBS) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.running += 1;
    try {
      return await task();
    } finally {
      this.running -= 1;
      this.waiters.shift()?.();
    }
  }

  private cacheKey(fileToken: string, width: ThumbWidth): string {
    const hash = createHash("sha256").update(fileToken).digest("hex").slice(0, 32);
    return `${hash}-w${width}`;
  }

  private filePath(key: string, ext: "webp" | "none"): string {
    return path.join(this.cacheDir, `${key}.${ext}`);
  }

  private sign(payload: ThumbTokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", this.secret)
      .update(TOKEN_PURPOSE + body)
      .digest("base64url");
    return `${body}.${signature}`;
  }

  private verify(token: string): ThumbTokenPayload | null {
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra !== undefined) return null;
    const expected = createHmac("sha256", this.secret)
      .update(TOKEN_PURPOSE + body)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return null;
    }
    try {
      const payload = JSON.parse(
        Buffer.from(body, "base64url").toString("utf8"),
      ) as Partial<ThumbTokenPayload>;
      if (
        typeof payload.f !== "string" ||
        typeof payload.n !== "string" ||
        typeof payload.u !== "string"
      ) {
        return null;
      }
      return payload as ThumbTokenPayload;
    } catch {
      return null;
    }
  }
}

/** 按文件名排除明显不是位图的附件（视频、PDF、设计源文件等），交给前端类型占位 */
export function isLikelyImage(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === "") return true;
  return [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".avif",
    ".tif",
    ".tiff",
    ".bmp",
    ".heic",
    ".heif",
  ].includes(ext);
}

export function isPreviewable(fileName: string): boolean {
  return isLikelyImage(fileName) || /\.pdf$/i.test(fileName);
}

export function selectPreviewSource(values: string[]): string | undefined {
  const named = values.map((value) => ({ value, name: decodeAttachmentLocator(value)?.fileName ?? "" }));
  return named.find(({ name }) => name && isLikelyImage(name))?.value
    ?? named.find(({ name }) => /\.pdf$/i.test(name))?.value;
}
