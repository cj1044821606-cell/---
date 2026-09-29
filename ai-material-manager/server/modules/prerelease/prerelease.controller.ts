import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type {
  PrereleaseReviewRequest,
  PrereleaseReviewResponse,
} from "@shared/prerelease";
import { PrereleaseService } from "./prerelease.service";

/** 策划人及审核人的审核按钮：预发布 → 正式发布 / 驳回下架 */
@Controller("api/prerelease")
export class PrereleaseController {
  constructor(private readonly prerelease: PrereleaseService) {}

  @NeedLogin()
  @Post(":materialId/approve")
  async approve(
    @Req() req: Request,
    @Param("materialId") materialId: string,
  ): Promise<PrereleaseReviewResponse> {
    return this.prerelease.approve(req.userContext.userId, materialId);
  }

  @NeedLogin()
  @Post(":materialId/reject")
  async reject(
    @Req() req: Request,
    @Param("materialId") materialId: string,
    @Body() body: PrereleaseReviewRequest,
  ): Promise<PrereleaseReviewResponse> {
    return this.prerelease.reject(
      req.userContext.userId,
      materialId,
      body?.reason,
    );
  }
}
