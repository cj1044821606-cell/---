import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  promises as fs,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { FeishuService } from "./feishu.service";

const MAX_UPLOAD_ALL_SIZE = 20 * 1024 * 1024;
const BLOCK_SIZE = 4 * 1024 * 1024;
const BASE_URL = "https://open.feishu.cn/open-apis/drive/v1/medias";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 30_000;
const PROGRESS_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const PROGRESS_TTL_MS = 10 * 60 * 1000;
const PROGRESS_FILE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PROGRESS_ENTRIES = 500;

interface ProgressEntry {
  progress: UploadProgress;
  ownerUserId: string;
  updatedAt: number;
}

export interface UploadProgress {
  taskId: string;
  fileName: string;
  totalSize: number;
  uploadedBlocks: number;
  totalBlocks: number;
  fileToken?: string;
  error?: string;
  status: "uploading" | "done" | "failed";
}

@Injectable()
export class FeishuUploadService {
  private readonly logger: Logger = new Logger(FeishuUploadService.name);
  private readonly progressMap: Map<string, ProgressEntry> = new Map();
  private readonly cancelSet: Set<string> = new Set();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly appToken: string;
  private readonly progressDir: string;

  constructor(
    private readonly feishuService: FeishuService,
    config: ConfigService,
  ) {
    this.appToken = config.get<string>("FEISHU_BASE_APP_TOKEN") ?? "";
    const uploadDir = config.get<string>("UPLOAD_DIR") ?? path.resolve("var/uploads");
    this.progressDir = path.join(uploadDir, "progress");
    if (!this.appToken) throw new Error("FEISHU_BASE_APP_TOKEN is required");
    mkdirSync(this.progressDir, { recursive: true });
  }

  cancel(taskId: string): void {
    this.cancelSet.add(taskId);
    this.logger.log(`Upload cancelled: taskId=${taskId}`);
  }

  hasProgress(taskId: string): boolean {
    return this.loadProgressEntry(taskId) !== undefined;
  }

  getProgress(taskId: string, ownerUserId: string): UploadProgress | undefined {
    const entry = this.loadProgressEntry(taskId);
    if (!entry || entry.ownerUserId !== ownerUserId) return undefined;
    return entry.progress;
  }

  private loadProgressEntry(taskId: string): ProgressEntry | undefined {
    const entry = this.progressMap.get(taskId);
    if (entry) return entry;
    const filePath = this.progressPath(taskId);
    if (!filePath || !existsSync(filePath)) return undefined;
    try {
      const stored = JSON.parse(readFileSync(filePath, "utf8")) as ProgressEntry;
      if (!stored.ownerUserId) return undefined;
      if (stored.progress.status === "uploading") {
        stored.progress = {
          ...stored.progress,
          status: "failed",
          error: "服务重启，上传任务已中断，请重新上传",
        };
        stored.updatedAt = Date.now();
        this.persistProgress(taskId, stored);
      }
      this.progressMap.set(taskId, stored);
      return stored;
    } catch (error) {
      this.logger.warn(`Failed to restore upload progress ${taskId}: ${String(error)}`);
      return undefined;
    }
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    taskId: string,
    ownerUserId: string,
  ): Promise<string> {
    this.ensureCleanup();
    this.beginTask(taskId, ownerUserId, {
      taskId,
      fileName,
      totalSize: buffer.length,
      uploadedBlocks: 0,
      totalBlocks: Math.ceil(buffer.length / BLOCK_SIZE),
      status: "uploading",
    });

    try {
      if (this.cancelSet.has(taskId)) {
        this.failProgress(taskId, "upload cancelled by client disconnect");
        throw new Error("upload cancelled");
      }

      const token: string = await this.feishuService.getTenantAccessToken();
      const fileToken: string = await this.uploadAll(
        token,
        buffer,
        fileName,
        taskId,
      );
      this.setProgress(taskId, {
        taskId,
        fileName,
        totalSize: buffer.length,
        uploadedBlocks: 1,
        totalBlocks: 1,
        fileToken,
        status: "done",
      });
      return fileToken;
    } catch (error) {
      this.failProgress(
        taskId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async uploadFileFromPath(
    filePath: string,
    taskId: string,
    fileName: string,
    totalSize: number,
    ownerUserId: string,
  ): Promise<string> {
    this.ensureCleanup();
    this.beginTask(taskId, ownerUserId, {
      taskId,
      fileName,
      totalSize,
      uploadedBlocks: 0,
      totalBlocks: Math.ceil(totalSize / BLOCK_SIZE),
      status: "uploading",
    });

    try {
      if (this.cancelSet.has(taskId)) {
        this.failProgress(taskId, "upload cancelled by client disconnect");
        throw new Error("upload cancelled");
      }

      const token: string = await this.feishuService.getTenantAccessToken();

      let fileToken: string;
      if (totalSize <= MAX_UPLOAD_ALL_SIZE) {
        const buffer: Buffer = await fs.readFile(filePath);
        fileToken = await this.uploadAll(token, buffer, fileName, taskId);
      } else {
        fileToken = await this.uploadChunkedFromPath(
          token,
          filePath,
          fileName,
          taskId,
          totalSize,
        );
      }
      const entry = this.progressMap.get(taskId);
      this.setProgress(taskId, {
        taskId,
        fileName,
        totalSize,
        uploadedBlocks: entry?.progress.totalBlocks ?? 0,
        totalBlocks: entry?.progress.totalBlocks ?? 0,
        fileToken,
        status: "done",
      });
      return fileToken;
    } catch (error) {
      this.failProgress(
        taskId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    } finally {
      await fs.unlink(filePath).catch(() => {});
    }
  }

  private failProgress(taskId: string, error: string): void {
    const entry = this.progressMap.get(taskId);
    this.setProgress(taskId, {
      taskId,
      fileName: entry?.progress.fileName ?? "unknown",
      totalSize: entry?.progress.totalSize ?? 0,
      uploadedBlocks: entry?.progress.uploadedBlocks ?? 0,
      totalBlocks: entry?.progress.totalBlocks ?? 0,
      error,
      status: "failed",
    });
  }

  private setProgress(taskId: string, progress: UploadProgress): void {
    const existing = this.progressMap.get(taskId);
    if (!existing) {
      throw new Error(`Upload progress owner missing: taskId=${taskId}`);
    }
    const entry = {
      progress,
      ownerUserId: existing.ownerUserId,
      updatedAt: Date.now(),
    };
    this.progressMap.set(taskId, entry);
    this.persistProgress(taskId, entry);
  }

  private beginTask(
    taskId: string,
    ownerUserId: string,
    progress: UploadProgress,
  ): void {
    const existing = this.loadProgressEntry(taskId);
    if (existing && existing.ownerUserId !== ownerUserId) {
      throw new Error("Upload task ID is already owned by another user");
    }
    const entry = { progress, ownerUserId, updatedAt: Date.now() };
    this.progressMap.set(taskId, entry);
    this.persistProgress(taskId, entry);
  }

  private ensureCleanup(): void {
    if (this.cleanupTimer !== null) return;
    void this.cleanupProgressFiles();
    this.cleanupTimer = setInterval(() => {
      this.cleanupProgressMap();
      void this.cleanupProgressFiles();
    }, PROGRESS_CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  private cleanupProgressMap(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.progressMap) {
      if (
        entry.progress.status !== "uploading" &&
        now - entry.updatedAt > PROGRESS_TTL_MS
      ) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.progressMap.delete(key);
      this.cancelSet.delete(key);
    }

    if (toDelete.length > 0) {
      this.logger.log(
        `ProgressMap cleanup: removed ${toDelete.length} stale entries`,
      );
    }

    if (this.progressMap.size > MAX_PROGRESS_ENTRIES) {
      const sorted = [...this.progressMap.entries()]
        .filter(([, e]) => e.progress.status !== "uploading")
        .sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      const excess = this.progressMap.size - MAX_PROGRESS_ENTRIES;
      for (let i = 0; i < excess && i < sorted.length; i += 1) {
        this.progressMap.delete(sorted[i][0]);
        this.cancelSet.delete(sorted[i][0]);
      }
      this.logger.log(
        `ProgressMap overflow: removed ${Math.min(excess, sorted.length)} entries`,
      );
    }
  }

  private async cleanupProgressFiles(): Promise<void> {
    const entries = await fs.readdir(this.progressDir).catch(() => []);
    const now = Date.now();
    let removed = 0;
    for (const fileName of entries) {
      if (!/^[A-Za-z0-9_-]{1,120}\.json$/u.test(fileName)) continue;
      const filePath = path.join(this.progressDir, fileName);
      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat || now - stat.mtimeMs < PROGRESS_FILE_TTL_MS) continue;
      const taskId = fileName.slice(0, -5);
      const inMemory = this.progressMap.get(taskId);
      if (inMemory?.progress.status === "uploading") continue;
      await fs.unlink(filePath).catch(() => undefined);
      removed += 1;
    }
    if (removed > 0) {
      this.logger.log(`Removed ${removed} stale progress files`);
    }
  }

  private createTimeoutController(): {
    controller: AbortController;
    timer: ReturnType<typeof setTimeout>;
  } {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);
    return { controller, timer };
  }

  private async uploadAll(
    token: string,
    buffer: Buffer,
    fileName: string,
    taskId: string,
  ): Promise<string> {
    const { controller, timer } = this.createTimeoutController();

    try {
      const formData = new FormData();
      formData.append("file_name", fileName);
      formData.append("parent_type", "bitable_file");
      formData.append("parent_node", this.appToken);
      formData.append("size", buffer.length.toString());
      formData.append(
        "file",
        new Blob([new Uint8Array(buffer)], {
          type: "application/octet-stream",
        }),
        fileName,
      );

      const response = await fetch(`${BASE_URL}/upload_all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      const result: {
        code: number;
        msg: string;
        data?: { file_token?: string };
      } = await response.json();

      if (result.code !== 0 || !result.data?.file_token) {
        throw new Error(
          `upload_all failed: code=${result.code} msg=${result.msg}`,
        );
      }

      this.logger.log(
        `upload_all done: file=${fileName} token=${result.data.file_token}`,
      );
      return result.data.file_token;
    } finally {
      clearTimeout(timer);
      this.cancelSet.delete(taskId);
    }
  }

  private async uploadChunkedFromPath(
    token: string,
    filePath: string,
    fileName: string,
    taskId: string,
    totalSize: number,
  ): Promise<string> {
    const totalBlocks: number = Math.ceil(totalSize / BLOCK_SIZE);

    const prepareResp = await this.fetchWithTimeout(
      `${BASE_URL}/upload_prepare`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_name: fileName,
          parent_type: "bitable_file",
          parent_node: this.appToken,
          size: totalSize,
        }),
      },
    );

    const prepareResult: {
      code: number;
      msg: string;
      data?: { upload_id?: string; block_size?: number; block_num?: number };
    } = await prepareResp.json();

    if (prepareResult.code !== 0 || !prepareResult.data?.upload_id) {
      throw new Error(
        `upload_prepare failed: code=${prepareResult.code} msg=${prepareResult.msg}`,
      );
    }

    const uploadId: string = prepareResult.data.upload_id;
    const preparedBlockSize = prepareResult.data.block_size;
    const preparedBlockNum = prepareResult.data.block_num;
    if (
      preparedBlockSize !== BLOCK_SIZE ||
      preparedBlockNum !== totalBlocks
    ) {
      throw new Error(
        `unexpected upload strategy: block_size=${preparedBlockSize} block_num=${preparedBlockNum}`,
      );
    }
    this.logger.log(
      `upload_prepare done: id=${uploadId} blocks=${totalBlocks}`,
    );

    const delay = (ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let seq = 0; seq < totalBlocks; seq += 1) {
      if (this.cancelSet.has(taskId)) {
        throw new Error(`upload cancelled at seq=${seq}/${totalBlocks}`);
      }

      const start: number = seq * BLOCK_SIZE;
      const end: number = Math.min(start + BLOCK_SIZE, totalSize);
      const chunkSize: number = end - start;

      const chunk: Buffer = await this.readChunk(filePath, start, end);
      const uploaded: boolean = await this.uploadPartWithRetry(
        token,
        uploadId,
        seq,
        chunkSize,
        chunk,
      );

      if (!uploaded) {
        throw new Error(
          `upload_part failed: seq=${seq} after ${MAX_RETRIES} retries`,
        );
      }

      this.setProgress(taskId, {
        taskId,
        fileName,
        totalSize,
        uploadedBlocks: seq + 1,
        totalBlocks,
        status: "uploading",
      });

      await delay(200);
    }

    const finishResp = await this.fetchWithTimeout(
      `${BASE_URL}/upload_finish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upload_id: uploadId,
          block_num: totalBlocks,
        }),
      },
    );

    const finishResult: {
      code: number;
      msg: string;
      data?: { file_token?: string };
    } = await finishResp.json();

    if (finishResult.code !== 0 || !finishResult.data?.file_token) {
      throw new Error(
        `upload_finish failed: code=${finishResult.code} msg=${finishResult.msg}`,
      );
    }

    this.logger.log(
      `upload_finish done: file=${fileName} token=${finishResult.data.file_token}`,
    );
    return finishResult.data.file_token;
  }

  private readChunk(
    filePath: string,
    start: number,
    end: number,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = createReadStream(filePath, { start, end: end - 1 });
      stream.on("data", (data: string | Buffer) =>
        chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data)),
      );
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  private async uploadPartWithRetry(
    token: string,
    uploadId: string,
    seq: number,
    chunkSize: number,
    chunk: Buffer,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const formData = new FormData();
        formData.append("upload_id", uploadId);
        formData.append("seq", seq.toString());
        formData.append("size", chunkSize.toString());
        formData.append(
          "file",
          new Blob([new Uint8Array(chunk)], {
            type: "application/octet-stream",
          }),
          `chunk_${seq}`,
        );

        const response = await this.fetchWithTimeout(
          `${BASE_URL}/upload_part`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        const result: { code: number; msg: string } = await response.json();

        if (result.code === 0) {
          return true;
        }

        this.logger.warn(
          `upload_part retry ${attempt}/${MAX_RETRIES}: seq=${seq} code=${result.code}`,
        );
      } catch (error) {
        this.logger.warn(
          `upload_part attempt ${attempt} failed: seq=${seq} error=${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * attempt),
        );
      }
    }
    return false;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const { controller, timer } = this.createTimeoutController();
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private progressPath(taskId: string): string | null {
    if (!/^[A-Za-z0-9_-]{1,120}$/u.test(taskId)) return null;
    return path.join(this.progressDir, `${taskId}.json`);
  }

  private persistProgress(taskId: string, entry: ProgressEntry): void {
    const filePath = this.progressPath(taskId);
    if (!filePath) return;
    try {
      writeFileSync(filePath, JSON.stringify(entry), { mode: 0o600 });
    } catch (error) {
      this.logger.warn(`Failed to persist upload progress ${taskId}: ${String(error)}`);
    }
  }
}
