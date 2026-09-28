import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import type { FeishuUploadService } from "@server/modules/feishu/feishu-upload.service";
import { UploadIngressService } from "@server/modules/pool/upload-ingress.service";
import { UploadQuotaService } from "@server/modules/pool/upload-quota.service";
import { AgentTicketService } from "./agent-ticket.service";
import { AgentUploadService } from "./agent-upload.service";

const CHUNK = 1024 * 1024;

function request(body: Buffer, headers: Record<string, string> = {}): Request {
  return Object.assign(Readable.from([body]), {
    headers: { ...headers, "content-length": String(body.length) },
  }) as unknown as Request;
}

describe("AgentUploadService", () => {
  let dir: string;
  let ingress: UploadIngressService;
  let tickets: AgentTicketService;
  let feishu: {
    hasProgress: jest.Mock;
    getProgress: jest.Mock;
    uploadFileFromPath: jest.Mock;
  };
  let service: AgentUploadService;
  const assembled: Buffer[] = [];

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-upload-"));
    const config = new ConfigService({
      SESSION_SECRET: "s".repeat(32),
      UPLOAD_DIR: dir,
      MAX_UPLOAD_BYTES: String(16 * CHUNK),
      UPLOAD_MIN_FREE_BYTES: "1",
      UPLOAD_MAX_STARTS_PER_MINUTE: "50",
      UPLOAD_MAX_CONCURRENT_PER_USER: "10",
      UPLOAD_MAX_BYTES_PER_HOUR: String(256 * CHUNK),
      UPLOAD_STALE_TTL_MS: String(60 * 60 * 1000),
      UPLOAD_CLEANUP_INTERVAL_MS: String(60 * 60 * 1000),
      AGENT_UPLOAD_CHUNK_BYTES: String(CHUNK),
    });
    ingress = new UploadIngressService(config, new UploadQuotaService(config));
    await ingress.onModuleInit();
    tickets = new AgentTicketService(config);
    assembled.length = 0;
    feishu = {
      hasProgress: jest.fn().mockReturnValue(false),
      getProgress: jest.fn(),
      uploadFileFromPath: jest.fn(async (filePath: string) => {
        assembled.push(await fs.readFile(filePath));
        return "file_token";
      }),
    };
    service = new AgentUploadService(
      tickets,
      ingress,
      feishu as unknown as FeishuUploadService,
    );
  });

  afterEach(async () => {
    ingress.onModuleDestroy();
    // 逐个删除本测试生成的文件，再删除空目录，不做递归删除
    const incoming = path.join(dir, "incoming");
    for (const name of await fs.readdir(incoming)) {
      await fs.unlink(path.join(incoming, name));
    }
    await fs.rmdir(incoming);
    await fs.rmdir(dir);
  });

  it("accepts a small file in one PUT and hands it to the Feishu uploader", async () => {
    const data = randomBytes(300 * 1024);
    const { ticket, upload } = tickets.issueUpload(
      "ou_alice",
      "IPV-1K612U-Datasheet-En-V1.0-M.pdf",
      data.length,
    );

    const result = await service.receive(request(data), ticket, undefined);

    expect(result).toMatchObject({ status: "accepted", taskId: upload.uploadId });
    expect(feishu.uploadFileFromPath).toHaveBeenCalledWith(
      expect.any(String),
      upload.uploadId,
      "IPV-1K612U-Datasheet-En-V1.0-M.pdf",
      data.length,
      "ou_alice",
    );
    // 转存飞书是后台任务：等模拟上传读完文件再比对内容
    await feishu.uploadFileFromPath.mock.results[0]?.value;
    expect(assembled[0]?.equals(data)).toBe(true);
  });

  it("assembles chunks that arrive out of order", async () => {
    const data = randomBytes(Math.floor(2.5 * CHUNK));
    const { ticket } = tickets.issueUpload("ou_alice", "video.mp4", data.length);
    const part = (i: number): Buffer =>
      data.subarray(i * CHUNK, Math.min((i + 1) * CHUNK, data.length));

    await expect(
      service.receive(request(part(2)), ticket, "2"),
    ).resolves.toMatchObject({ status: "receiving", missingChunks: [0, 1] });
    await expect(
      service.receive(request(part(0)), ticket, "0"),
    ).resolves.toMatchObject({ status: "receiving", missingChunks: [1] });
    await expect(
      service.receive(request(part(1)), ticket, "1"),
    ).resolves.toMatchObject({ status: "accepted" });

    expect(feishu.uploadFileFromPath).toHaveBeenCalledTimes(1);
    await feishu.uploadFileFromPath.mock.results[0]?.value;
    expect(assembled[0]?.equals(data)).toBe(true);
  });

  it("requires X-Chunk-Index for files larger than one chunk", async () => {
    const data = randomBytes(CHUNK + 10);
    const { ticket } = tickets.issueUpload("ou_alice", "big.pdf", data.length);
    await expect(
      service.receive(request(data), ticket, undefined),
    ).rejects.toThrow(/X-Chunk-Index/u);
  });

  it("rejects form-encoded bodies with a helpful hint", async () => {
    const data = Buffer.from("hello");
    const { ticket } = tickets.issueUpload("ou_alice", "a.txt", data.length);
    await expect(
      service.receive(
        request(data, { "content-type": "application/x-www-form-urlencoded" }),
        ticket,
        undefined,
      ),
    ).rejects.toThrow(/curl -T/u);
  });

  it("rejects tampered or expired tickets", async () => {
    const data = Buffer.from("hello");
    const { ticket } = tickets.issueUpload("ou_alice", "a.txt", data.length);
    await expect(
      service.receive(request(data), `${ticket}x`, undefined),
    ).rejects.toThrow(/上传链接/u);

    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now + 3 * 60 * 60 * 1000);
    try {
      await expect(
        service.receive(request(data), ticket, undefined),
      ).rejects.toThrow(/上传链接/u);
    } finally {
      spy.mockRestore();
    }
  });

  it("returns the existing task when the same ticket is retried after hand-off", async () => {
    const { ticket, upload } = tickets.issueUpload("ou_alice", "a.txt", 5);
    feishu.hasProgress.mockReturnValue(true);
    feishu.getProgress.mockReturnValue({ status: "uploading" });

    await expect(
      service.receive(request(Buffer.from("hello")), ticket, undefined),
    ).resolves.toMatchObject({ status: "accepted", taskId: upload.uploadId });
    expect(feishu.uploadFileFromPath).not.toHaveBeenCalled();
  });
});
