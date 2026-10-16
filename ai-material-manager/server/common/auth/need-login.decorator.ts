import { UseGuards } from "@nestjs/common";
import { DivisionAccessGuard } from "./division-access.guard";
import { SessionAuthGuard } from "./session-auth.guard";

/** 登录且属于储能事业部（或在人员表中）才可访问 */
export const NeedLogin = (): MethodDecorator & ClassDecorator =>
  UseGuards(SessionAuthGuard, DivisionAccessGuard);

/** 只要求登录：身份与登录接口用它，前端才能拿到 accessState 渲染无权限页 */
export const NeedSession = (): MethodDecorator & ClassDecorator =>
  UseGuards(SessionAuthGuard);
