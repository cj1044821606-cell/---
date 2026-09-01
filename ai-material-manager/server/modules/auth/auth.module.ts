import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { SessionAuthGuard } from "@server/common/auth/session-auth.guard";
import { SessionService } from "@server/common/auth/session.service";

@Global()
@Module({
  controllers: [AuthController],
  providers: [SessionService, SessionAuthGuard],
  exports: [SessionService, SessionAuthGuard],
})
export class AuthModule {}
