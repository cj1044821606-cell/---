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

@Controller("api/files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

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
