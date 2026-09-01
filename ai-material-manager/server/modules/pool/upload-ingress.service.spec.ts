import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import {
  BROWSER_CHUNK_SIZE,
  UploadIngressService,
} from "./upload-ingress.service";
import { UploadQuotaService } from "./upload-quota.service";

function requestWithBody(
  body: Buffer,
  headers: Record<string, string>,
): Request {
  return Object.assign(Readable.from([body]), {
    headers: {
      ...headers,
      "content-length": String(body.length),
    },
  }) as unknown as Request;
}

describe("UploadIngressService", () => {
  let uploadDir: string;
  let service: UploadIngressService;

  beforeEach(async () => {
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-ingress-"));
    const config = new ConfigService({
      UPLOAD_DIR: uploadDir,
      MAX_UPLOAD_BYTES: String(8 * 1024 * 1024),
      UPLOAD_MIN_FREE_BYTES: "1",
      UPLOAD_MAX_STARTS_PER_MINUTE: "10",
      UPLOAD_MAX_CONCURRENT_PER_USER: "3",
      UPLOAD_MAX_BYTES_PER_HOUR: String(64 * 1024 * 1024),
      UPLOAD_STALE_TTL_MS: String(60 * 60 * 1000),
      UPLOAD_CLEANUP_INTERVAL_MS: String(60 * 60 * 1000),
    });
    service = new UploadIngressService(config, new UploadQuotaService(config));
    await service.onModuleInit();
  });

  afterEach(async () => {
    service.onModuleDestroy();
    const incomingDir = path.join(uploadDir, "incoming");
    const entries = await fs.readdir(incomingDir).catch(() => []);
    for (const entry of entries) {
      await fs.unlink(path.join(incomingDir, entry));
    }
    await fs.rmdir(incomingDir).catch(() => undefined);
    await fs.rmdir(uploadDir).catch(() => undefined);
  });

  it("accepts an authenticated single-part stream and removes its manifest", async () => {
    const body = Buffer.from("hello material");
    const received = await service.receive(
      requestWithBody(body, {
        "x-file-name": encodeURIComponent("poster.png"),
        "x-file-size": String(body.length),
      }),
      "ou_owner",
    );

    expect(await fs.readFile(received.filePath, "utf8")).toBe("hello material");
    await service.finishStaging(received.uploadId);
    await expect(
      fs.access(path.join(uploadDir, "incoming", `${received.uploadId}.manifest.json`)),
    ).rejects.toThrow();
  });

  it("rejects an oversized declaration before creating upload artifacts", async () => {
    const body = Buffer.from("x");
    await expect(
      service.receive(
        requestWithBody(body, {
          "x-file-name": encodeURIComponent("too-large.psd"),
          "x-file-size": String(9 * 1024 * 1024),
        }),
        "ou_owner",
      ),
    ).rejects.toThrow("单个文件不能超过");

    expect(await fs.readdir(path.join(uploadDir, "incoming"))).toEqual([]);
  });

  it("does not allow another user to resume the same chunked upload", async () => {
    const totalSize = BROWSER_CHUNK_SIZE + 1;
    const uploadId = "upload_owner_test";
    const headers = {
      "x-file-name": encodeURIComponent("large.psd"),
      "x-file-size": String(totalSize),
      "x-chunk-index": "0",
      "x-chunk-total": "2",
      "x-upload-id": uploadId,
    };
    await service.receive(
      requestWithBody(Buffer.alloc(BROWSER_CHUNK_SIZE), headers),
      "ou_owner",
    );

    const otherRequest = requestWithBody(Buffer.alloc(0), headers);
    otherRequest.headers["content-length"] = String(BROWSER_CHUNK_SIZE);
    await expect(service.receive(otherRequest, "ou_other")).rejects.toThrow(
      "上传任务与当前文件不匹配",
    );
  }, 15_000);
});
