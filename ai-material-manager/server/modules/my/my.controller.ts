import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type {
  MyHandledResponse,
  MyReceivedResponse,
  MySubscribedResponse,
} from "@shared/api.interface";
import { MyService } from "./my.service";

@Controller("api/my")
export class MyController {
  constructor(private readonly myService: MyService) {}

  @NeedLogin()
  @Get("received")
  async getReceived(@Req() req: Request): Promise<MyReceivedResponse> {
    const userId: string = req.userContext.userId;
    return this.myService.getReceived(userId);
  }

  @NeedLogin()
  @Get("subscribed")
  async getSubscribed(@Req() req: Request): Promise<MySubscribedResponse> {
    const userId: string = req.userContext.userId;
    return this.myService.getSubscribed(userId);
  }

  @NeedLogin()
  @Get("handled")
  async getHandled(@Req() req: Request): Promise<MyHandledResponse> {
    const userId: string = req.userContext.userId;
    return this.myService.getHandled(userId);
  }
}
