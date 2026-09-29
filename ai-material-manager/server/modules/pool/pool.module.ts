import { Module } from "@nestjs/common";
import { PoolController } from "./pool.controller";
import { PoolService } from "./pool.service";
import { UploadIngressService } from "./upload-ingress.service";
import { UploadQuotaService } from "./upload-quota.service";

@Module({
  controllers: [PoolController],
  providers: [PoolService, UploadQuotaService, UploadIngressService],
  exports: [PoolService, UploadIngressService],
})
export class PoolModule {}
