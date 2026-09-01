import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as lark from "@larksuiteoapi/node-sdk";
import type { SessionUser } from "@server/common/auth/session.types";

@Injectable()
export class FeishuService {
  readonly client: lark.Client;
  private readonly appId: string;
  private readonly redirectUri: string;

  constructor(config: ConfigService) {
    this.appId = config.get<string>("FEISHU_APP_ID") ?? "";
    const appSecret = config.get<string>("FEISHU_APP_SECRET") ?? "";
    this.redirectUri = config.get<string>("FEISHU_REDIRECT_URI") ?? "";
    if (!this.appId || !appSecret || !this.redirectUri) {
      throw new Error(
        "FEISHU_APP_ID, FEISHU_APP_SECRET and FEISHU_REDIRECT_URI are required",
      );
    }
    this.client = new lark.Client({
      appId: this.appId,
      appSecret,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });
  }

  async getTenantAccessToken(): Promise<string> {
    const token = await this.client.tokenManager.getTenantAccessToken();
    if (typeof token !== "string" || !token) {
      throw new Error("getTenantAccessToken returned an empty token");
    }
    return token;
  }

  buildOAuthAuthorizeUrl(state: string): string {
    const query = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
    });
    return `https://accounts.feishu.cn/open-apis/authen/v1/authorize?${query.toString()}`;
  }

  async exchangeOAuthCode(code: string): Promise<string> {
    if (!code) throw new Error("OAuth callback did not include code");
    const response = await this.client.accessToken.retrieveByAuthorizationCode({
      code,
      redirectUri: this.redirectUri,
    });
    if (!response.accessToken) {
      throw new Error("OAuth token exchange returned no access token");
    }
    return response.accessToken;
  }

  async getOAuthUser(userAccessToken: string): Promise<SessionUser> {
    const response = await this.client.authen.userInfo.get(
      {},
      lark.withUserAccessToken(userAccessToken),
    );
    if (response.code !== 0 || !response.data?.open_id) {
      throw new Error(`getOAuthUser failed: ${response.msg ?? response.code}`);
    }
    return {
      userId: response.data.open_id,
      name: response.data.name ?? "飞书用户",
      avatarUrl: response.data.avatar_url ?? null,
    };
  }
}
