import { axiosForBackend } from "@client/src/lib/api-client";
import axios from "axios";
import type {
  PoolActionResponse,
  PoolConfirmAction,
  PoolOldVersionResponse,
  PoolUploadFileChunkResponse,
  PoolUploadFileProgressResponse,
  PoolUploadFileResponse,
  PoolUploadRequest,
  PoolUploadResponse,
} from "@shared/api.interface";

const CHUNK_SIZE = 4 * 1024 * 1024;
const CHUNK_MAX_ATTEMPTS = 4;
const CHUNK_RETRY_DELAY_MS = 800;

export interface BrowserUploadProgress {
  uploadedChunks: number;
  totalChunks: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uploadFailureMessage(error: unknown, chunkIndex: number): string {
  if (axios.isAxiosError(error)) {
    const serverMessage =
      typeof error.response?.data?.message === "string"
        ? error.response.data.message
        : typeof error.response?.data?.error?.message === "string"
          ? error.response.data.error.message
        : null;
    if (serverMessage) return serverMessage;
    if (error.response?.status) {
      return `分片 ${chunkIndex + 1} 上传失败（HTTP ${error.response.status}）`;
    }
    if (error.code === "ECONNABORTED") {
      return `分片 ${chunkIndex + 1} 上传超时`;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

/** B-3：AI 追问就地回答（服务端三字段同写：补充回复 + 待识别 + 解锁） */
export async function replyPoolRecord(
  recordId: string,
  reply: string,
): Promise<void> {
  await axiosForBackend.post("/api/pool/reply", { recordId, reply });
}

/** B-4：确认卡三按钮 */
export async function confirmPoolRecord(
  recordId: string,
  action: PoolConfirmAction,
  reason?: string,
): Promise<PoolActionResponse> {
  const resp = await axiosForBackend.post<PoolActionResponse>(
    "/api/pool/confirm",
    { recordId, action, reason },
  );
  return resp.data;
}

/** B-1：前端上传写池 */
export async function uploadPoolRecord(
  payload: PoolUploadRequest,
): Promise<PoolUploadResponse> {
  const resp = await axiosForBackend.post<PoolUploadResponse>(
    "/api/pool/upload",
    payload,
  );
  return resp.data;
}

async function uploadPoolFileChunked(
  file: File,
  onProgress?: (progress: BrowserUploadProgress) => void,
): Promise<PoolUploadFileResponse> {
  const totalChunks: number = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId: string = `upload_${Date.now()}_${crypto.randomUUID().replaceAll("-", "")}`;

  for (let i = 0; i < totalChunks; i += 1) {
    const start: number = i * CHUNK_SIZE;
    const end: number = Math.min(start + CHUNK_SIZE, file.size);
    const chunk: Blob = file.slice(start, end);

    let resp: Awaited<
      ReturnType<typeof axiosForBackend.post<PoolUploadFileChunkResponse>>
    > | null = null;
    let lastError: unknown;

    for (let attempt = 1; attempt <= CHUNK_MAX_ATTEMPTS; attempt += 1) {
      try {
        resp = await axiosForBackend.post<PoolUploadFileChunkResponse>(
          "/api/pool/upload-file",
          chunk,
          {
            headers: {
              "Content-Type": "application/octet-stream",
              "X-File-Name": encodeURIComponent(file.name),
              "X-File-Size": String(file.size),
              "X-Chunk-Index": String(i),
              "X-Chunk-Total": String(totalChunks),
              "X-Upload-Id": uploadId,
            },
          },
        );
        break;
      } catch (error) {
        lastError = error;
        if (attempt < CHUNK_MAX_ATTEMPTS) {
          await wait(CHUNK_RETRY_DELAY_MS * attempt);
        }
      }
    }

    if (!resp) {
      throw new Error(
        `${uploadFailureMessage(lastError, i)}，已自动重试 ${CHUNK_MAX_ATTEMPTS} 次`,
      );
    }

    onProgress?.({ uploadedChunks: i + 1, totalChunks });

    if (i === totalChunks - 1 && resp.data.taskId) {
      return { taskId: resp.data.taskId };
    }
  }

  throw new Error("upload failed: no taskId returned");
}

/** B-0：上传文件到飞书素材库 */
export async function uploadPoolFile(
  file: File,
  onProgress?: (progress: BrowserUploadProgress) => void,
): Promise<PoolUploadFileResponse> {
  if (file.size > CHUNK_SIZE) {
    return uploadPoolFileChunked(file, onProgress);
  }

  const resp = await axiosForBackend.post<PoolUploadFileResponse>(
    "/api/pool/upload-file",
    file,
    {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        "X-File-Size": String(file.size),
      },
    },
  );
  onProgress?.({ uploadedChunks: 1, totalChunks: 1 });
  return resp.data;
}

/** B-0：轮询上传进度 */
export async function pollUploadProgress(
  taskId: string,
): Promise<PoolUploadFileProgressResponse> {
  const resp = await axiosForBackend.get<PoolUploadFileProgressResponse>(
    "/api/pool/upload-file/progress",
    { params: { taskId } },
  );
  return resp.data;
}

/** B-1：关联旧版本候选搜索 */
export async function searchOldVersions(
  keyword: string,
): Promise<PoolOldVersionResponse> {
  const resp = await axiosForBackend.get<PoolOldVersionResponse>(
    "/api/pool/old-versions",
    { params: { keyword } },
  );
  return resp.data;
}
