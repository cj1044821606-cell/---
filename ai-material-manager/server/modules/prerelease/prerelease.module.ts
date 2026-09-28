import { Module } from "@nestjs/common";
import { IdentityModule } from "@server/modules/identity/identity.module";
import { PrereleaseController } from "./prerelease.controller";
import { PrereleaseService } from "./prerelease.service";

@Module({
  imports: [IdentityModule],
  controllers: [PrereleaseController],
  providers: [PrereleaseService],
  exports: [PrereleaseService],
})
export class PrereleaseModule {}
