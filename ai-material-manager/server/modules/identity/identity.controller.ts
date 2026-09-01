import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type { Identity } from "@shared/identity";
import { IdentityService } from "./identity.service";

@Controller("api/identity")
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @NeedLogin()
  @Get()
  async getIdentity(@Req() req: Request): Promise<Identity> {
    const userId: string = req.userContext.userId;
    return this.identityService.resolve(userId);
  }
}
