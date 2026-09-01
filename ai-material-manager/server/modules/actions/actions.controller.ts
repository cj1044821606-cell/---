import { BadRequestException, Body, Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type {
  FeedbackActionRequest,
  FeedbackActionResponse,
  ReceiveActionRequest,
  ReceiveActionResponse,
  ReceiveBatchActionRequest,
  ReceiveBatchActionResponse,
  RetireActionRequest,
  RetireActionResponse,
  RestoreActionRequest,
  RestoreActionResponse,
  SubscribeActionRequest,
  SubscribeActionResponse,
} from "@shared/material";
import { ActionsService } from "./actions.service";

@Controller("api/actions")
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @NeedLogin()
  @Post("receive")
  async receive(
    @Body() body: ReceiveActionRequest,
    @Req() req: Request,
  ): Promise<ReceiveActionResponse> {
    const userId: string = req.userContext.userId;
    const rawMaterialId: unknown = body?.materialId;
    if (typeof rawMaterialId !== "string" || rawMaterialId.trim().length === 0) {
      throw new BadRequestException("materialId 不能为空");
    }
    return this.actionsService.receive(userId, rawMaterialId.trim());
  }

  @NeedLogin()
  @Post("receive-batch")
  async receiveBatch(
    @Body() body: ReceiveBatchActionRequest,
    @Req() req: Request,
  ): Promise<ReceiveBatchActionResponse> {
    const userId: string = req.userContext.userId;
    const rawMaterialIds: unknown = body?.materialIds;
    if (!Array.isArray(rawMaterialIds)) {
      throw new BadRequestException("materialIds 必须为数组");
    }
    return this.actionsService.receiveBatch(userId, rawMaterialIds);
  }

  @NeedLogin()
  @Post("subscribe")
  async subscribe(
    @Body() body: SubscribeActionRequest,
    @Req() req: Request,
  ): Promise<SubscribeActionResponse> {
    const userId: string = req.userContext.userId;
    const rawMaterialId: unknown = body?.materialId;
    const rawSubscribe: unknown = body?.subscribe;
    if (typeof rawMaterialId !== "string" || rawMaterialId.trim().length === 0) {
      throw new BadRequestException("materialId 不能为空");
    }
    if (typeof rawSubscribe !== "boolean") {
      throw new BadRequestException("subscribe 必须为布尔值");
    }
    return this.actionsService.subscribe(userId, rawMaterialId.trim(), rawSubscribe);
  }

  @NeedLogin()
  @Post("feedback")
  async feedback(
    @Body() body: FeedbackActionRequest,
    @Req() req: Request,
  ): Promise<FeedbackActionResponse> {
    const userId: string = req.userContext.userId;
    return this.actionsService.feedback(userId, body);
  }

  @NeedLogin()
  @Post("retire")
  async retire(
    @Body() body: RetireActionRequest,
    @Req() req: Request,
  ): Promise<RetireActionResponse> {
    const userId: string = req.userContext.userId;
    return this.actionsService.retire(userId, body);
  }

  @NeedLogin()
  @Post("restore")
  async restore(
    @Body() body: RestoreActionRequest,
    @Req() req: Request,
  ): Promise<RestoreActionResponse> {
    const userId: string = req.userContext.userId;
    return this.actionsService.restore(userId, body);
  }
}
