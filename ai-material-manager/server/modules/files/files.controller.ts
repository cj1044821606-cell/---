import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import { FilesService } from "./files.service";
import { ThumbnailService } from "./thumbnail.service";

/** 缩略图 URL 只随文件版本变化，可让浏览器长期缓存 */
const THUMB_CACHE_CONTROL = "private, max-age=31536000, immutable";

@Controller("api/files")
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly thumbnails: ThumbnailService,
  ) {}

  @NeedLogin()
  @Get("thumb")
  async thumb(
    @Query("token") token: string,
    @Query("w") widthRaw: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) throw new BadRequestException("Missing thumbnail token");
    const locator = this.thumbnails.verifyToken(token, req.userContext.userId);
    const width = this.thumbnails.parseWidth(widthRaw);
    const result = await this.thumbnails.get(locator, width);

    if (result.kind === "none") {
      // 无法生成缩略图（视频/超大文件/格式不支持），前端据此降级到原图或类型占位
      res.setHeader("Cache-Control", "private, max-age=600");
      res.status(404).json({ error: "Thumbnail unavailable" });
      return;
    }

    const etag = `"${result.etag}"`;
    res.setHeader("Cache-Control", THUMB_CACHE_CONTROL);
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader("Content-Type", "image/webp");
    const stream = this.thumbnails.createReadStream(result.filePath);
    stream.on("error", () => {
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    stream.pipe(res);
  }

  @NeedLogin()
  @Get("download")
  async download(
    @Query("token") token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) throw new BadRequestException("Missing download token");
    const payload = this.filesService.verifyMediaToken(
      token,
      req.userContext.userId,
    );

    try {
      await this.filesService.proxyToken(payload, res);
    } catch (error: unknown) {
      if (!res.headersSent) {
        res.status(502).json({ error: "Failed to download file from upstream" });
      }
    }
  }
}
