import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type { InboxResponse } from "@shared/inbox";
import { InboxService } from "./inbox.service";

@Controller("api/inbox")
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @NeedLogin()
  @Get()
  async listInbox(@Req() req: Request): Promise<InboxResponse> {
    // userId 来自登录态，禁止前端传入
    const userId: string = req.userContext.userId;
    return this.inboxService.listForUser(userId);
  }
}
