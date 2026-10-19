import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Request } from "express";
import { IdentityService } from "@server/modules/identity/identity.service";

/**
 * 只放行储能事业部成员或人员表中的人；必须排在 SessionAuthGuard 之后（依赖 userContext）。
 * 部门暂时无法验证时返回 503，前端据此提示稍后重试，而不是当作无权限。
 */
@Injectable()
export class DivisionAccessGuard implements CanActivate {
  constructor(private readonly identity: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const { accessState } = await this.identity.resolve(req.userContext.userId);
    if (accessState === "granted") return true;
    if (accessState === "unverified") {
      throw new ServiceUnavailableException({
        code: "DEPARTMENT_UNAVAILABLE",
        message: "暂时无法验证部门，请稍后重试",
      });
    }
    throw new ForbiddenException({
      code: "NOT_IN_DIVISION",
      message: "本系统仅对储能事业部开放",
    });
  }
}
