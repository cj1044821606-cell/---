import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '@server/common/auth/session.service';
import { AgentTokenService } from './agent-token.service';
import { bearerToken } from './bearer';

/**
 * 网页登录或个人访问令牌二选一。
 * 用于 Skill 下载：用户把“配置口令”发给 AI 助手后，助手用令牌自己下载安装，不需要浏览器登录。
 */
@Injectable()
export class SessionOrAgentTokenGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly tokens: AgentTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const session = this.sessions.readSession(req);
    if (session) {
      req.userContext = session;
      return true;
    }
    const principal = this.tokens.authenticate(bearerToken(req));
    if (principal) {
      const { tokenId: _tokenId, ...user } = principal;
      req.userContext = user;
      return true;
    }
    throw new UnauthorizedException(
      '请先通过飞书登录，或以 Authorization: Bearer <个人访问令牌> 访问',
    );
  }
}
