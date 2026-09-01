import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { SessionService } from "./session.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const session = this.sessions.readSession(req);
    if (!session) {
      throw new UnauthorizedException("请先通过飞书登录");
    }
    req.userContext = session;
    return true;
  }
}
