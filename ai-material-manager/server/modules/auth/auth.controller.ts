import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import { SessionService } from "@server/common/auth/session.service";
import type { SessionUser } from "@server/common/auth/session.types";
import { FeishuService } from "@server/modules/feishu/feishu.service";

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly feishu: FeishuService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  @Get("login")
  login(
    @Query("next") next: string | undefined,
    @Res() res: Response,
  ): void {
    const state = this.sessions.createOAuthState(next);
    this.sessions.setOAuthStateCookie(res, state);
    res.redirect(this.feishu.buildOAuthAuthorizeUrl(state));
  }

  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const cookieState = this.sessions.readOAuthStateCookie(req);
    if (!cookieState || cookieState !== state) {
      this.sessions.verifyOAuthState(undefined);
    }
    const verified = this.sessions.verifyOAuthState(state);
    const accessToken = await this.feishu.exchangeOAuthCode(code);
    const user = await this.feishu.getOAuthUser(accessToken);
    this.sessions.setSessionCookie(res, user);
    this.sessions.clearOAuthStateCookie(res);
    res.redirect(verified.next);
  }

  @NeedLogin()
  @Get("me")
  me(@Req() req: Request): SessionUser {
    return req.userContext;
  }

  @NeedLogin()
  @Post("logout")
  logout(@Res() res: Response): void {
    this.sessions.clearSessionCookie(res);
    res.status(204).send();
  }

  @Get("dev-login")
  devLogin(@Res() res: Response): void {
    if (this.config.get<string>("NODE_ENV") === "production") {
      throw new NotFoundException();
    }
    const userId = this.config.get<string>("DEV_USER_OPEN_ID");
    if (!userId) throw new NotFoundException("DEV_USER_OPEN_ID 未配置");
    this.sessions.setSessionCookie(res, {
      userId,
      name: "本地开发用户",
      avatarUrl: null,
    });
    res.redirect("/library");
  }
}
