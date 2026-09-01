import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { assembleUploadChunks, chunkPath } from "./upload-staging";

describe("upload staging", () => {
  let incomingDir: string;

  beforeEach(async () => {
    incomingDir = await fs.mkdtemp(path.join(os.tmpdir(), "material-upload-"));
  });

  afterEach(async () => {
    const entries = await fs.readdir(incomingDir).catch(() => []);
    for (const entry of entries) {
      await fs.unlink(path.join(incomingDir, entry));
    }
    await fs.rmdir(incomingDir);
  });

  it("assembles ordered chunks and removes the chunk files", async () => {
    await fs.writeFile(chunkPath(incomingDir, "upload_test", 0), "hello ");
    await fs.writeFile(chunkPath(incomingDir, "upload_test", 1), "world");

    const result = await assembleUploadChunks({
      incomingDir,
      uploadId: "upload_test",
      chunkTotal: 2,
      expectedSize: 11,
    });

    expect(await fs.readFile(result.filePath, "utf8")).toBe("hello world");
    expect(result.fileSize).toBe(11);
    await expect(
      fs.access(chunkPath(incomingDir, "upload_test", 0)),
    ).rejects.toThrow();
  });

  it("rejects an incomplete upload without creating a final file", async () => {
    await fs.writeFile(chunkPath(incomingDir, "upload_partial", 0), "hello");

    await expect(
      assembleUploadChunks({
        incomingDir,
        uploadId: "upload_partial",
        chunkTotal: 2,
        expectedSize: 10,
      }),
    ).rejects.toThrow("missing upload chunks: 1");
  });
});
