import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type { Request } from "express";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type {
  PoolActionResponse,
  PoolConfirmAction,
  PoolConfirmRequest,
  PoolOldVersionResponse,
  PoolReplyRequest,
  PoolUploadRequest,
  PoolUploadResponse,
  PoolUploadFileResponse,
  PoolUploadFileChunkResponse,
  PoolUploadFileProgressResponse,
} from "@shared/api.interface";
import { PoolService } from "./pool.service";
import { FeishuUploadService } from "../feishu/feishu-upload.service";
import { assembleUploadChunks } from "./upload-staging";
import { UploadIngressService } from "./upload-ingress.service";
import { buildNamingPreview, parseGuidedNamingInput } from "@shared/naming";

const CONFIRM_ACTIONS: PoolConfirmAction[] = ["publish", "store", "reject"];

@Controller("api/pool")
export class PoolController {
  private readonly logger: Logger = new Logger(PoolController.name);

  constructor(
    private readonly poolService: PoolService,
    private readonly uploadService: FeishuUploadService,
    private readonly uploadIngress: UploadIngressService,
  ) {}

  /** B-3：AI 追问就地回答（三字段同写） */
  @NeedLogin()
  @Post("reply")
  async reply(@Body() body: PoolReplyRequest): Promise<PoolActionResponse> {
    if (
      typeof body.recordId !== "string" ||
      body.recordId.trim().length === 0
    ) {
      throw new BadRequestException("recordId is required");
    }
    const reply: string = (body.reply ?? "").trim();
    if (reply.length === 0) {
      throw new BadRequestException("reply is required");
    }
    if (reply.length > 2000) {
      throw new BadRequestException("reply too long (max 2000)");
    }
    return this.poolService.reply(body.recordId.trim(), reply);
  }

  /** B-4：确认卡三按钮（通过并发布 / 仅入库 / 退回修改） */
  @NeedLogin()
  @Post("confirm")
  async confirm(@Body() body: PoolConfirmRequest): Promise<PoolActionResponse> {
    if (
      typeof body.recordId !== "string" ||
      body.recordId.trim().length === 0
    ) {
      throw new BadRequestException("recordId is required");
    }
    if (!CONFIRM_ACTIONS.includes(body.action)) {
      throw new BadRequestException("invalid action");
    }
    let reason: string | undefined;
    if (body.action === "reject") {
      reason = (body.reason ?? "").trim();
      if (reason.length === 0) {
        throw new BadRequestException("reason is required for reject");
      }
    }
    return this.poolService.confirm(body.recordId.trim(), body.action, reason);
  }

  /** B-1：前端上传写池 */
  @NeedLogin()
  @Post("upload")
  async upload(
    @Req() req: Request,
    @Body() body: PoolUploadRequest,
  ): Promise<PoolUploadResponse> {
    const { userId } = req.userContext;
    const originalFileName: string = (body.originalFileName ?? "").trim();
    if (originalFileName.length === 0) {
      throw new BadRequestException("originalFileName is required");
    }
    const uploadFileM: string[] = body.uploadFileM ?? [];
    if (uploadFileM.length === 0) {
      throw new BadRequestException("uploadFileM is required");
    }
    if (
      body.plannerAuditorId !== undefined &&
      (typeof body.plannerAuditorId !== "string" ||
        body.plannerAuditorId.trim().length === 0)
    ) {
      throw new BadRequestException("plannerAuditorId must be an open_id");
    }
    const namingMode = body.namingMode ?? "ai";
    if (namingMode !== "ai" && namingMode !== "guided") {
      throw new BadRequestException("invalid namingMode");
    }
    const namingInput =
      namingMode === "guided"
        ? parseGuidedNamingInput(body.namingInput)
        : undefined;
    if (
      namingMode === "guided" &&
      (!namingInput || !buildNamingPreview(namingInput).complete)
    ) {
      throw new BadRequestException("guided naming information is incomplete");
    }
    const normalizedNamingInput = namingInput ?? undefined;
    return this.poolService.upload(
      {
        ...body,
        originalFileName,
        uploadFileM,
        plannerAuditorId: body.plannerAuditorId?.trim(),
        namingMode,
        namingInput: normalizedNamingInput,
      },
      userId,
    );
  }

  /** B-0：上传文件到飞书素材库（流式写入 UPLOAD_DIR，不占内存），返回 taskId。
   *  支持分片上传：客户端通过 X-Chunk-Total / X-Upload-Id 头分片传输大文件。 */
  @NeedLogin()
  @Post("upload-file")
  async uploadFile(
    @Req() req: Request,
  ): Promise<PoolUploadFileResponse | PoolUploadFileChunkResponse> {
    const userId = req.userContext.userId;
    const requestedUploadId = this.uploadIngress.requestedUploadId(req);
    if (
      requestedUploadId &&
      this.uploadService.hasProgress(requestedUploadId)
    ) {
      const existingProgress = this.uploadService.getProgress(
        requestedUploadId,
        userId,
      );
      if (!existingProgress) {
        throw new BadRequestException("上传任务不可用，请重新选择文件");
      }
      return { taskId: requestedUploadId };
    }

    const received = await this.uploadIngress.receive(req, userId);
    let filePath = received.filePath;
    const fileName = received.fileName;
    let fileSize = received.receivedSize;
    const uploadId = received.uploadId;

    if (received.isChunked) {
      if (received.chunkIndex < received.chunkTotal - 1) {
        return { uploadId, chunkIndex: received.chunkIndex };
      }

      try {
        const uploadDir = process.env.UPLOAD_DIR ?? path.resolve("var/uploads");
        await this.uploadIngress.ensureAssemblySpace(received.expectedSize);
        const assembled = await assembleUploadChunks({
          incomingDir: path.join(uploadDir, "incoming"),
          uploadId,
          chunkTotal: received.chunkTotal,
          expectedSize: received.expectedSize,
        });
        filePath = assembled.filePath;
        fileSize = assembled.fileSize;
      } catch (error) {
        this.uploadIngress.release(uploadId);
        throw new BadRequestException(
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    await this.uploadIngress.finishStaging(uploadId);
    this.uploadService
      .uploadFileFromPath(filePath, uploadId, fileName, fileSize, userId)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.log(
          `uploadFileFromPath failed: taskId=${uploadId} fileName=${fileName} error=${message}`,
        );
      });

    return { taskId: uploadId };
  }

  /** B-0：轮询分片上传进度 */
  @NeedLogin()
  @Get("upload-file/progress")
  async uploadFileProgress(
    @Req() req: Request,
    @Query("taskId") taskId: string,
  ): Promise<PoolUploadFileProgressResponse> {
    if (!taskId) {
      throw new BadRequestException("taskId is required");
    }
    const progress = this.uploadService.getProgress(
      taskId,
      req.userContext.userId,
    );
    if (!progress) {
      throw new NotFoundException("task not found");
    }
    return progress;
  }

  /** B-1：关联旧版本候选（版本记录表本地搜索） */
  @NeedLogin()
  @Get("old-versions")
  async oldVersions(
    @Query("keyword") keyword?: string,
  ): Promise<PoolOldVersionResponse> {
    return this.poolService.listOldVersions(keyword);
  }
}
