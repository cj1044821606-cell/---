import { Module } from "@nestjs/common";
import { IdentityModule } from "@server/modules/identity/identity.module";
import { InboxController } from "./inbox.controller";
import { InboxService } from "./inbox.service";

@Module({
  imports: [IdentityModule],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
