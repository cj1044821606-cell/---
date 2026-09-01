import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface UploadStart {
  uploadId: string;
  size: number;
  startedAt: number;
}

interface ActiveUpload {
  uploadId: string;
  userId: string;
  lastActivityAt: number;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

function tooManyRequests(message: string): HttpException {
  return new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
}

function positiveInteger(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const value = Number(config.get<string>(key));
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

@Injectable()
export class UploadQuotaService {
  private readonly startsByUser = new Map<string, UploadStart[]>();
  private readonly activeById = new Map<string, ActiveUpload>();
  private readonly maxStartsPerMinute: number;
  private readonly maxConcurrentPerUser: number;
  private readonly maxBytesPerHour: number;
  private readonly activeTtlMs: number;

  constructor(config: ConfigService) {
    this.maxStartsPerMinute = positiveInteger(
      config,
      "UPLOAD_MAX_STARTS_PER_MINUTE",
      3,
    );
    this.maxConcurrentPerUser = positiveInteger(
      config,
      "UPLOAD_MAX_CONCURRENT_PER_USER",
      2,
    );
    this.maxBytesPerHour = positiveInteger(
      config,
      "UPLOAD_MAX_BYTES_PER_HOUR",
      4 * 1024 * 1024 * 1024,
    );
    this.activeTtlMs = positiveInteger(
      config,
      "UPLOAD_ACTIVE_TTL_MS",
      15 * MINUTE_MS,
    );
  }

  reserveNew(userId: string, uploadId: string, size: number): void {
    const now = Date.now();
    this.prune(now);

    const activeForUser = [...this.activeById.values()].filter(
      (item) => item.userId === userId,
    );
    if (activeForUser.length >= this.maxConcurrentPerUser) {
      throw tooManyRequests(
        `同时上传的文件过多，最多 ${this.maxConcurrentPerUser} 个`,
      );
    }

    const history = this.startsByUser.get(userId) ?? [];
    const recentStarts = history.filter(
      (item) => now - item.startedAt < MINUTE_MS,
    );
    if (recentStarts.length >= this.maxStartsPerMinute) {
      throw tooManyRequests(
        `上传过于频繁，每分钟最多开始 ${this.maxStartsPerMinute} 个文件`,
      );
    }

    const hourlyBytes = history
      .filter((item) => now - item.startedAt < HOUR_MS)
      .reduce((sum, item) => sum + item.size, 0);
    if (hourlyBytes + size > this.maxBytesPerHour) {
      throw tooManyRequests("本小时上传总量已达到上限，请稍后再试");
    }

    history.push({ uploadId, size, startedAt: now });
    this.startsByUser.set(userId, history);
    this.activeById.set(uploadId, { uploadId, userId, lastActivityAt: now });
  }

  resume(userId: string, uploadId: string): void {
    const now = Date.now();
    this.prune(now);
    const existing = this.activeById.get(uploadId);
    if (existing && existing.userId !== userId) {
      throw tooManyRequests("上传任务不可用，请重新选择文件");
    }
    if (!existing) {
      const activeForUser = [...this.activeById.values()].filter(
        (item) => item.userId === userId,
      );
      if (activeForUser.length >= this.maxConcurrentPerUser) {
        throw tooManyRequests(
          `同时上传的文件过多，最多 ${this.maxConcurrentPerUser} 个`,
        );
      }
    }
    this.activeById.set(uploadId, { uploadId, userId, lastActivityAt: now });
  }

  touch(userId: string, uploadId: string): void {
    const existing = this.activeById.get(uploadId);
    if (existing && existing.userId === userId) {
      existing.lastActivityAt = Date.now();
    }
  }

  release(uploadId: string): void {
    this.activeById.delete(uploadId);
  }

  isActive(uploadId: string): boolean {
    this.prune(Date.now());
    return this.activeById.has(uploadId);
  }

  private prune(now: number): void {
    for (const [userId, history] of this.startsByUser) {
      const recent = history.filter((item) => now - item.startedAt < HOUR_MS);
      if (recent.length === 0) {
        this.startsByUser.delete(userId);
      } else {
        this.startsByUser.set(userId, recent);
      }
    }
    for (const [uploadId, active] of this.activeById) {
      if (now - active.lastActivityAt >= this.activeTtlMs) {
        this.activeById.delete(uploadId);
      }
    }
  }
}
