import { Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { SystemConfigService } from "./system-config.service";
import { FilesModule } from "@server/modules/files/files.module";

@Module({
  imports: [FilesModule],
  controllers: [SettingsController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SettingsModule {}
