import { ConfigService } from "@nestjs/config";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { encodeAttachmentLocator } from "@server/common/utils/attachment-locator.util";
import type { FilesService } from "./files.service";
import { ThumbnailService, isLikelyImage } from "./thumbnail.service";
import { PdfPreviewService } from "./pdf-preview.service";
import { jsPDF } from "jspdf";

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 90, b: 160 } },
  })
    .png()
    .toBuffer();
}

describe("ThumbnailService", () => {
  let dir: string;
  let fetchUpstream: jest.Mock;
  let service: ThumbnailService;
  const locator = encodeAttachmentLocator({ fileToken: "boxcn-a", fileName: "render.png" });

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "thumbs-"));
    const png = await makePng(2400, 1800);
    fetchUpstream = jest.fn(async () => new Response(new Uint8Array(png)));
    const config = new ConfigService({ SESSION_SECRET: "s".repeat(32), THUMB_CACHE_DIR: dir });
    service = new ThumbnailService({ fetchUpstream } as unknown as FilesService, config, new PdfPreviewService());
    await service.onModuleInit();
  });

  afterEach(async () => {
    // 逐个删除本测试生成的文件，再删除空目录，不做递归删除
    for (const name of await fs.readdir(dir)) {
      await fs.unlink(path.join(dir, name));
    }
    await fs.rmdir(dir);
  });

  it("issues a stable, user-bound URL without expiry", () => {
    const first = service.makeThumbUrl(locator, "ou_1");
    const second = service.makeThumbUrl(locator, "ou_1");
    expect(first).toBe(second);
    expect(first).toMatch(/^\/api\/files\/thumb\?token=.+&w=480$/u);
    expect(service.makeThumbUrl(locator, "ou_2")).not.toBe(first);

    const token = decodeURIComponent(first!.split("token=")[1]!.split("&")[0]!);
    expect(service.verifyToken(token, "ou_1")).toEqual({
      fileToken: "boxcn-a",
      fileName: "render.png",
    });
    expect(() => service.verifyToken(token, "ou_2")).toThrow();
    expect(() => service.verifyToken(`${token}x`, "ou_1")).toThrow();
  });

  it("downscales once to WebP and reuses the cached file", async () => {
    const target = { fileToken: "boxcn-a", fileName: "render.png" };
    const [a, b] = await Promise.all([service.get(target, 480), service.get(target, 480)]);
    expect(fetchUpstream).toHaveBeenCalledTimes(1);
    expect(a.kind).toBe("file");
    expect(b).toEqual(a);
    if (a.kind !== "file") throw new Error("expected file");

    const meta = await sharp(a.filePath).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(480);
    expect(meta.height).toBe(360);

    await service.get(target, 480);
    expect(fetchUpstream).toHaveBeenCalledTimes(1);
  });

  it("treats a new file_token (new version) as a new thumbnail", async () => {
    await service.get({ fileToken: "boxcn-a", fileName: "a.png" }, 480);
    await service.get({ fileToken: "boxcn-b", fileName: "a.png" }, 480);
    expect(fetchUpstream).toHaveBeenCalledTimes(2);
  });

  it("negative-caches sources that cannot be decoded", async () => {
    fetchUpstream.mockImplementation(async () => new Response("not an image"));
    const target = { fileToken: "boxcn-bad", fileName: "clip.png" };
    await expect(service.get(target, 480)).resolves.toEqual({ kind: "none" });
    await expect(service.get(target, 480)).resolves.toEqual({ kind: "none" });
    expect(fetchUpstream).toHaveBeenCalledTimes(1);
  });

  it("only backs off briefly when the Feishu download itself fails", async () => {
    fetchUpstream.mockRejectedValueOnce(new Error("HTTP 429"));
    const target = { fileToken: "boxcn-flaky", fileName: "a.png" };
    await expect(service.get(target, 480)).resolves.toEqual({ kind: "none" });
    expect((await fs.readdir(dir)).some((name) => name.endsWith(".none"))).toBe(false);

    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now + 61_000);
    try {
      await expect(service.get(target, 480)).resolves.toMatchObject({ kind: "file" });
    } finally {
      spy.mockRestore();
    }
    expect(fetchUpstream).toHaveBeenCalledTimes(2);
  });

  it("skips non-image attachments so the client can fall back", () => {
    const video = encodeAttachmentLocator({ fileToken: "boxcn-v", fileName: "demo.mp4" });
    expect(service.makeThumbUrl(video, "ou_1")).toBeNull();
    expect(isLikelyImage("Poster.JPG")).toBe(true);
    expect(isLikelyImage("spec.pdf")).toBe(false);
  });

  it("warms thumbnails in the background", async () => {
    service.warm([locator, locator, null]);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(fetchUpstream).toHaveBeenCalledTimes(1);
    const files = await fs.readdir(dir);
    expect(files.some((name) => name.endsWith(".webp"))).toBe(true);
  });

  it("renders only PDF page one and removes the temporary PDF", async () => {
    const pdf = new jsPDF({ format: [100, 100] });
    pdf.setFillColor(255, 0, 0);
    pdf.rect(0, 0, 100, 100, "F");
    pdf.addPage();
    pdf.setFillColor(0, 0, 255);
    pdf.rect(0, 0, 100, 100, "F");
    fetchUpstream.mockImplementation(async () => new Response(pdf.output("arraybuffer")));
    const target = { fileToken: "pdf-test", fileName: "spec.PDF" };
    expect(service.makeThumbUrl(encodeAttachmentLocator(target), "ou_1")).not.toBeNull();
    const result = await service.get(target, 480);
    if (result.kind !== "file") throw new Error("expected PDF thumbnail");
    const { data } = await sharp(result.filePath).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(200);
    expect(data[2]).toBeLessThan(40);
    expect((await fs.readdir(dir)).filter((name) => name.endsWith(".pdf"))).toEqual([]);
    await service.get(target, 480);
    expect(fetchUpstream).toHaveBeenCalledTimes(1);
  }, 45_000);

  it("cleans malformed PDFs after renderer failure", async () => {
    fetchUpstream.mockImplementation(async () => new Response("broken pdf"));
    await expect(service.get({ fileToken: "bad-pdf", fileName: "broken.pdf" }, 480)).resolves.toEqual({ kind: "none" });
    expect((await fs.readdir(dir)).filter((name) => name.endsWith(".pdf"))).toEqual([]);
  }, 45_000);
});
