import { Module } from "@nestjs/common";
import { IdentityModule } from "@server/modules/identity/identity.module";
import { ActionsController } from "./actions.controller";
import { ActionsService } from "./actions.service";
import { BitableWriteService } from "./bitable-write.service";

@Module({
  imports: [IdentityModule],
  controllers: [ActionsController],
  providers: [BitableWriteService, ActionsService],
  exports: [BitableWriteService],
})
export class ActionsModule {}
