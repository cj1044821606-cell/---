import { Global, Module } from "@nestjs/common";
import { FeishuService } from "./feishu.service";
import { FeishuUploadService } from "./feishu-upload.service";
import { FeishuBaseGateway } from "./feishu-base.gateway";

@Global()
@Module({
  providers: [FeishuService, FeishuUploadService, FeishuBaseGateway],
  exports: [FeishuService, FeishuUploadService, FeishuBaseGateway],
})
export class FeishuModule {}
