import { Global, Module } from "@nestjs/common";
import { FeishuService } from "./feishu.service";
import { FeishuUploadService } from "./feishu-upload.service";
import { FeishuBaseGateway } from "./feishu-base.gateway";
import { DriveArchiveService } from "./drive-archive.service";
import { DriveArchiveRouter } from "./drive-archive-router";

@Global()
@Module({
  providers: [FeishuService, FeishuUploadService, FeishuBaseGateway, DriveArchiveRouter, DriveArchiveService],
  exports: [FeishuService, FeishuUploadService, FeishuBaseGateway, DriveArchiveService],
})
export class FeishuModule {}
