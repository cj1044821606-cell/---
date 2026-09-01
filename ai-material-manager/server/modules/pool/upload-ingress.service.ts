import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { chunkPath, normalizeUploadId } from "./upload-staging";
import { UploadQuotaService } from "./upload-quota.service";

export const BROWSER_CHUNK_SIZE = 4 * 1024 * 1024;

interface UploadManifest {
  uploadId: string;
  userId: string;
  fileName: string;
  expectedSize: number;
  chunkTotal: number;
  lastActivityAt: number;
}

export interface ReceivedUpload {
  filePath: string;
  fileName: string;
  receivedSize: number;
  expectedSize: number;
  uploadId: string;
  isChunked: boolean;
  chunkTotal: number;
  chunkIndex: number;
}

interface ParsedMetadata {
  fileName: string;
  expectedSize: number;
  uploadId: string;
  isChunked: boolean;
  chunkTotal: number;
  chunkIndex: number;
  expectedChunkSize: number;
}

const DEFAULT_MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;
const DEFAULT_MIN_FREE_BYTES = 512 * 1024 * 1024;
const DEFAULT_STALE_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const MAX_CLEANUP_FILES_PER_SWEEP = 500;

function positiveInteger(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const value = Number(config.get<string>(key));
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function headerValue(req: Request, name: string): string {
  const value = req.headers[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function uploadIdFromArtifact(fileName: string): string | null {
  const patterns = [
    /^(.+)\.manifest\.json$/u,
    /^(.+)\.\d+\.chunk$/u,
    /^(.+)\.\d+\.[A-Za-z0-9]+\.tmp$/u,
    /^(.+)\.(?:part|building)$/u,
  ];
  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    const uploadId = match?.[1] ? normalizeUploadId(match[1]) : null;
    if (uploadId) return uploadId;
  }
  return null;
}

@Injectable()
export class UploadIngressService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UploadIngressService.name);
  private readonly uploadDir: string;
  private readonly incomingDir: string;
  private readonly maxUploadBytes: number;
  private readonly minFreeBytes: number;
  private readonly staleTtlMs: number;
  private readonly cleanupIntervalMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    config: ConfigService,
    private readonly quota: UploadQuotaService,
  ) {
    this.uploadDir = config.get<string>("UPLOAD_DIR") ?? path.resolve("var/uploads");
    this.incomingDir = path.join(this.uploadDir, "incoming");
    this.maxUploadBytes = positiveInteger(
      config,
      "MAX_UPLOAD_BYTES",
      DEFAULT_MAX_UPLOAD_BYTES,
    );
    this.minFreeBytes = positiveInteger(
      config,
      "UPLOAD_MIN_FREE_BYTES",
      DEFAULT_MIN_FREE_BYTES,
    );
    this.staleTtlMs = positiveInteger(
      config,
      "UPLOAD_STALE_TTL_MS",
      DEFAULT_STALE_TTL_MS,
    );
    this.cleanupIntervalMs = positiveInteger(
      config,
      "UPLOAD_CLEANUP_INTERVAL_MS",
      DEFAULT_CLEANUP_INTERVAL_MS,
    );
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.incomingDir, { recursive: true });
    await this.cleanupStaleArtifacts();
    this.cleanupTimer = setInterval(() => {
      void this.cleanupStaleArtifacts();
    }, this.cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
  }

  requestedUploadId(req: Request): string | null {
    return normalizeUploadId(headerValue(req, "x-upload-id"));
  }

  async receive(req: Request, userId: string): Promise<ReceivedUpload> {
    await fs.mkdir(this.incomingDir, { recursive: true });
    const metadata = this.parseMetadata(req);
    const manifest = await this.readManifest(metadata.uploadId);

    if (manifest) {
      this.assertManifestMatches(manifest, metadata, userId);
      this.quota.resume(userId, metadata.uploadId);
    } else {
      this.quota.reserveNew(userId, metadata.uploadId, metadata.expectedSize);
      try {
        await this.ensureFreeSpace(
          metadata.expectedSize * 2 + this.minFreeBytes,
          "磁盘空间不足，无法开始该文件上传",
        );
        await this.writeManifest({
          uploadId: metadata.uploadId,
          userId,
          fileName: metadata.fileName,
          expectedSize: metadata.expectedSize,
          chunkTotal: metadata.chunkTotal,
          lastActivityAt: Date.now(),
        });
      } catch (error) {
        this.quota.release(metadata.uploadId);
        throw error;
      }
    }

    await this.ensureFreeSpace(
      metadata.expectedChunkSize + this.minFreeBytes,
      "磁盘剩余空间不足，请稍后再试",
    );

    const temporaryPath = path.join(
      this.incomingDir,
      `${metadata.uploadId}.${metadata.chunkIndex}.${Math.random().toString(36).slice(2, 10)}.tmp`,
    );
    const acceptedPath = metadata.isChunked
      ? chunkPath(this.incomingDir, metadata.uploadId, metadata.chunkIndex)
      : path.join(this.incomingDir, `${metadata.uploadId}.part`);

    let receivedSize = 0;
    const byteLimiter = new Transform({
      transform: (chunk: Buffer, _encoding, callback) => {
        receivedSize += chunk.length;
        if (receivedSize > metadata.expectedChunkSize) {
          callback(
            new PayloadTooLargeException("上传分片超过声明大小，请重新选择文件"),
          );
          return;
        }
        callback(null, chunk);
      },
    });

    try {
      await pipeline(
        req,
        byteLimiter,
        createWriteStream(temporaryPath, { flags: "wx", mode: 0o600 }),
      );
      if (receivedSize !== metadata.expectedChunkSize) {
        throw new BadRequestException(
          `上传分片大小不匹配：应为 ${metadata.expectedChunkSize}，实际为 ${receivedSize}`,
        );
      }
      await fs.rename(temporaryPath, acceptedPath);
      await this.touchManifest(metadata.uploadId);
      this.quota.touch(userId, metadata.uploadId);
      return {
        filePath: acceptedPath,
        fileName: metadata.fileName,
        receivedSize,
        expectedSize: metadata.expectedSize,
        uploadId: metadata.uploadId,
        isChunked: metadata.isChunked,
        chunkTotal: metadata.chunkTotal,
        chunkIndex: metadata.chunkIndex,
      };
    } catch (error) {
      await fs.unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }

  async ensureAssemblySpace(expectedSize: number): Promise<void> {
    await this.ensureFreeSpace(
      expectedSize + this.minFreeBytes,
      "磁盘空间不足，无法组装大文件",
    );
  }

  async finishStaging(uploadId: string): Promise<void> {
    this.quota.release(uploadId);
    await fs.unlink(this.manifestPath(uploadId)).catch(() => undefined);
  }

  release(uploadId: string): void {
    this.quota.release(uploadId);
  }

  async cleanupStaleArtifacts(): Promise<number> {
    const entries = await fs.readdir(this.incomingDir, { withFileTypes: true });
    const groups = new Map<
      string,
      Array<{ filePath: string; modifiedAt: number }>
    >();

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const uploadId = uploadIdFromArtifact(entry.name);
      if (!uploadId) continue;
      const filePath = path.join(this.incomingDir, entry.name);
      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat) continue;
      const group = groups.get(uploadId) ?? [];
      group.push({ filePath, modifiedAt: stat.mtimeMs });
      groups.set(uploadId, group);
    }

    const now = Date.now();
    let removed = 0;
    for (const [uploadId, files] of groups) {
      if (removed >= MAX_CLEANUP_FILES_PER_SWEEP) break;
      if (this.quota.isActive(uploadId)) continue;
      const lastActivity = Math.max(...files.map((file) => file.modifiedAt));
      if (now - lastActivity < this.staleTtlMs) continue;
      for (const file of files) {
        if (removed >= MAX_CLEANUP_FILES_PER_SWEEP) break;
        await fs.unlink(file.filePath).catch(() => undefined);
        removed += 1;
      }
    }
    if (removed > 0) {
      this.logger.log(`Removed ${removed} stale upload artifacts`);
    }
    return removed;
  }

  private parseMetadata(req: Request): ParsedMetadata {
    const rawName = headerValue(req, "x-file-name");
    let decodedName: string;
    try {
      decodedName = decodeURIComponent(rawName);
    } catch {
      throw new BadRequestException("文件名编码无效");
    }
    const fileName = path.basename(decodedName.trim());
    if (!fileName || fileName.length > 255 || fileName.includes("\0")) {
      throw new BadRequestException("文件名无效或过长");
    }

    const expectedSize = Number(headerValue(req, "x-file-size"));
    if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) {
      throw new BadRequestException("X-File-Size 必须是有效的正整数");
    }
    if (expectedSize > this.maxUploadBytes) {
      throw new PayloadTooLargeException(
        `单个文件不能超过 ${Math.floor(this.maxUploadBytes / 1024 / 1024)}MB`,
      );
    }

    const chunkTotalRaw = headerValue(req, "x-chunk-total");
    const chunkIndexRaw = headerValue(req, "x-chunk-index");
    const uploadIdRaw = headerValue(req, "x-upload-id");
    const hasChunkMetadata =
      chunkTotalRaw !== "" || chunkIndexRaw !== "" || uploadIdRaw !== "";

    if (!hasChunkMetadata) {
      if (expectedSize > BROWSER_CHUNK_SIZE) {
        throw new BadRequestException("超过 4MB 的文件必须使用分片上传");
      }
      this.assertContentLength(req, expectedSize);
      return {
        fileName,
        expectedSize,
        uploadId: `upload_${Date.now()}_${randomUUID().replaceAll("-", "")}`,
        isChunked: false,
        chunkTotal: 1,
        chunkIndex: 0,
        expectedChunkSize: expectedSize,
      };
    }

    const chunkTotal = Number(chunkTotalRaw);
    const chunkIndex = Number(chunkIndexRaw);
    const uploadId = normalizeUploadId(uploadIdRaw);
    const expectedChunkTotal = Math.ceil(expectedSize / BROWSER_CHUNK_SIZE);
    if (
      !uploadId ||
      !Number.isSafeInteger(chunkTotal) ||
      !Number.isSafeInteger(chunkIndex) ||
      chunkTotal < 2 ||
      chunkTotal !== expectedChunkTotal ||
      chunkIndex < 0 ||
      chunkIndex >= chunkTotal
    ) {
      throw new BadRequestException("上传分片参数无效");
    }

    const start = chunkIndex * BROWSER_CHUNK_SIZE;
    const expectedChunkSize = Math.min(
      BROWSER_CHUNK_SIZE,
      expectedSize - start,
    );
    this.assertContentLength(req, expectedChunkSize);
    return {
      fileName,
      expectedSize,
      uploadId,
      isChunked: true,
      chunkTotal,
      chunkIndex,
      expectedChunkSize,
    };
  }

  private assertContentLength(req: Request, expected: number): void {
    const raw = headerValue(req, "content-length");
    if (!raw) return;
    const contentLength = Number(raw);
    if (!Number.isSafeInteger(contentLength) || contentLength !== expected) {
      throw new BadRequestException("请求体大小与分片声明不一致");
    }
  }

  private manifestPath(uploadId: string): string {
    return path.join(this.incomingDir, `${uploadId}.manifest.json`);
  }

  private async readManifest(uploadId: string): Promise<UploadManifest | null> {
    try {
      return JSON.parse(
        await fs.readFile(this.manifestPath(uploadId), "utf8"),
      ) as UploadManifest;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new BadRequestException("上传任务状态损坏，请重新选择文件");
    }
  }

  private async writeManifest(manifest: UploadManifest): Promise<void> {
    await fs.writeFile(
      this.manifestPath(manifest.uploadId),
      JSON.stringify(manifest),
      { mode: 0o600, flag: "wx" },
    );
  }

  private async touchManifest(uploadId: string): Promise<void> {
    const manifest = await this.readManifest(uploadId);
    if (!manifest) return;
    manifest.lastActivityAt = Date.now();
    await fs.writeFile(this.manifestPath(uploadId), JSON.stringify(manifest), {
      mode: 0o600,
    });
  }

  private assertManifestMatches(
    manifest: UploadManifest,
    metadata: ParsedMetadata,
    userId: string,
  ): void {
    if (
      manifest.userId !== userId ||
      manifest.fileName !== metadata.fileName ||
      manifest.expectedSize !== metadata.expectedSize ||
      manifest.chunkTotal !== metadata.chunkTotal
    ) {
      throw new BadRequestException("上传任务与当前文件不匹配，请重新选择文件");
    }
  }

  private async ensureFreeSpace(requiredBytes: number, message: string): Promise<void> {
    const stat = await fs.statfs(this.incomingDir);
    const availableBytes = stat.bavail * stat.bsize;
    if (availableBytes < requiredBytes) {
      throw new ServiceUnavailableException(message);
    }
  }
}
