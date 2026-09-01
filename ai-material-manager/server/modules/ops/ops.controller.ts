import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type { OpsResponse } from "@shared/ops";
import { OpsService } from "./ops.service";

@Controller("api/ops")
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @NeedLogin()
  @Get()
  async getOps(@Req() req: Request): Promise<OpsResponse> {
    const userId: string = req.userContext.userId;
    return this.opsService.getOps(userId);
  }
}
