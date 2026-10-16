import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as os from "node:os";
import * as path from "node:path";

import { buildUploadCommands, combineUploadCommands } from "./upload-commands";

/**
 * 真正执行生成的 bash 脚本，对着本地假服务器上传，验证字节完整、分片重试生效。
 * 需要 bash / dd / curl（macOS、Linux 与 CI 均自带）。
 */
const hasShell = process.platform !== "win32";
const run = hasShell ? it : it.skip;

interface Received {
  chunks: Map<string, Map<number, Buffer>>;
  failOnce: Set<string>;
}

async function startServer(received: Received): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const parts: Buffer[] = [];
    req.on("data", (c: Buffer) => parts.push(c));
    req.on("end", () => {
      const key = req.url ?? "";
      const index = Number(req.headers["x-chunk-index"] ?? 0);
      const failKey = `${key}#${index}`;
      if (received.failOnce.has(failKey)) {
        received.failOnce.delete(failKey);
        res.statusCode = 502;
        res.end("flaky");
        return;
      }
      const file = received.chunks.get(key) ?? new Map<number, Buffer>();
      file.set(index, Buffer.concat(parts));
      received.chunks.set(key, file);
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function bash(script: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile("bash", ["-c", script], { timeout: 30_000 }, (error, stdout, stderr) => {
      resolve({ code: error ? Number((error as { code?: number }).code ?? 1) : 0, stdout, stderr });
    });
  });
}

function joined(file: Map<number, Buffer> | undefined): Buffer {
  if (!file) return Buffer.alloc(0);
  return Buffer.concat([...file.entries()].sort(([a], [b]) => a - b).map(([, b]) => b));
}

describe("generated upload scripts (bash)", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-cmd-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  run("uploads a chunked file and a small file in one combined script, retrying a flaky chunk", async () => {
    const received: Received = { chunks: new Map(), failOnce: new Set(["/big#1", "/small#0"]) };
    const server = await startServer(received);
    try {
      const big = randomBytes(2500);
      const small = randomBytes(300);
      const bigPath = path.join(dir, "it's big.psd");
      const smallPath = path.join(dir, "small.pdf");
      await fs.writeFile(bigPath, big);
      await fs.writeFile(smallPath, small);

      const script = combineUploadCommands([
        {
          label: "L it's big.psd",
          commands: buildUploadCommands({ uploadUrl: `${server.url}/big`, localPath: bigPath, chunkSize: 1024, chunkCount: 3 }),
        },
        {
          label: "M small.pdf",
          commands: buildUploadCommands({ uploadUrl: `${server.url}/small`, localPath: smallPath, chunkSize: 1024, chunkCount: 1 }),
        },
      ]).bash;

      const result = await bash(script);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("ALL UPLOADS SENT");
      expect(joined(received.chunks.get("/big")).equals(big)).toBe(true);
      expect(joined(received.chunks.get("/small")).equals(small)).toBe(true);
      expect(received.failOnce.size).toBe(0);
    } finally {
      await server.close();
    }
  }, 40_000);

  run("stops and names the file when a chunk keeps failing", async () => {
    const received: Received = { chunks: new Map(), failOnce: new Set() };
    const server = await startServer(received);
    try {
      const filePath = path.join(dir, "a.pdf");
      await fs.writeFile(filePath, randomBytes(10));
      const script = combineUploadCommands([
        {
          label: "M a.pdf",
          commands: buildUploadCommands({ uploadUrl: "http://127.0.0.1:9/never", localPath: filePath, chunkSize: 1024, chunkCount: 1 }),
        },
        {
          label: "S b.jpg",
          commands: buildUploadCommands({ uploadUrl: `${server.url}/b`, localPath: filePath, chunkSize: 1024, chunkCount: 1 }),
        },
      ]).bash;
      const result = await bash(script);
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain("FAILED: M a.pdf");
      expect(received.chunks.has("/b")).toBe(false);
    } finally {
      await server.close();
    }
  }, 40_000);
});
