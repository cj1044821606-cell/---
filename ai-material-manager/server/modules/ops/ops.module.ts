import { Module } from "@nestjs/common";
import { IdentityModule } from "@server/modules/identity/identity.module";
import { SettingsModule } from "@server/modules/settings/settings.module";
import { OpsController } from "./ops.controller";
import { OpsService } from "./ops.service";

@Module({
  imports: [IdentityModule, SettingsModule],
  controllers: [OpsController],
  providers: [OpsService],
})
export class OpsModule {}
