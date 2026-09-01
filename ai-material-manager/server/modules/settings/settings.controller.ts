import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type { SystemSettings } from "@shared/settings";
import { SystemConfigService } from "./system-config.service";

@Controller("api/system-settings")
export class SettingsController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @NeedLogin()
  @Get()
  async getSettings(@Req() req: Request): Promise<SystemSettings> {
    return this.systemConfigService.getSettings(req.userContext.userId);
  }
}
