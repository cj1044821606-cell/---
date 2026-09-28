import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import { FilesService } from "@server/modules/files/files.service";
import { IdentityService } from "@server/modules/identity/identity.service";
import type {
  AgentConnectionInfo,
  AgentTokenCreateRequest,
  AgentTokenCreateResponse,
  AgentTokenListResponse,
} from "@shared/agent";
import { AgentTicketService } from "./agent-ticket.service";
import {
  AgentTokenService,
  MAX_ACTIVE_TOKENS_PER_USER,
} from "./agent-token.service";
import { AgentUploadService, type AgentUploadResult } from "./agent-upload.service";
import { MCP_SERVER_NAME } from "./agent.constants";
import { publicBaseUrl } from "./public-url";
import { SessionOrAgentTokenGuard } from "./session-or-token.guard";
import { buildSkillZip } from "./skill-kit";

@Controller("api/agent")
export class AgentController {
  constructor(
    private readonly config: ConfigService,
    private readonly tokens: AgentTokenService,
    private readonly tickets: AgentTicketService,
    private readonly uploads: AgentUploadService,
    private readonly files: FilesService,
    private readonly identity: IdentityService,
  ) {}

  @NeedLogin()
  @Get("connection")
  connection(@Req() req: Request): AgentConnectionInfo {
    const base = this.baseUrl(req);
    return {
      mcpUrl: `${base}/mcp`,
      serverName: MCP_SERVER_NAME,
      skillDownloadUrl: `${base}/api/agent/skill.zip`,
    };
  }

  @NeedLogin()
  @Get("tokens")
  listTokens(@Req() req: Request): AgentTokenListResponse {
    return {
      items: this.tokens.list(req.userContext.userId),
      limit: MAX_ACTIVE_TOKENS_PER_USER,
    };
  }

  @NeedLogin()
  @Post("tokens")
  async createToken(
    @Req() req: Request,
    @Body() body: AgentTokenCreateRequest,
  ): Promise<AgentTokenCreateResponse> {
    if ((await this.identity.resolve(req.userContext.userId)).isVisitor) {
      throw new ForbiddenException("访客账号不能创建 AI 助手令牌");
    }
    return this.tokens.issue(req.userContext, body?.label, body?.ttlDays);
  }

  @NeedLogin()
  @Delete("tokens/:id")
  async revokeToken(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<{ success: true }> {
    await this.tokens.revoke(req.userContext.userId, id);
    return { success: true };
  }

  /**
   * Skill 压缩包：解压到 AI 助手的 skills 目录，或在 Claude 设置里直接上传。
   * 除网页登录外也接受个人访问令牌，AI 助手按“配置口令”可以自己下载安装。
   */
  @UseGuards(SessionOrAgentTokenGuard)
  @Get("skill.zip")
  skill(@Req() req: Request, @Res() res: Response): void {
    const zip = buildSkillZip({ baseUrl: this.baseUrl(req) });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="material-assistant-skill.zip"',
    );
    res.setHeader("Cache-Control", "no-store");
    res.end(zip);
  }

  /**
   * 上传凭证 URL（由 MCP 工具 prepare_upload 签发）。不需要登录 Cookie：
   * 凭证本身绑定用户、限时有效，方便 AI 助手直接用 curl 传文件。
   */
  @Put("uploads/:ticket")
  async upload(
    @Req() req: Request,
    @Param("ticket") ticket: string,
    @Headers("x-chunk-index") chunkIndex: string | undefined,
  ): Promise<AgentUploadResult> {
    return this.uploads.receive(req, ticket, chunkIndex);
  }

  /** 下载凭证 URL（由 MCP 工具 get_material_files 签发），同样限时且绑定用户 */
  @Get("downloads/:ticket")
  async download(
    @Param("ticket") ticket: string,
    @Res() res: Response,
  ): Promise<void> {
    const { userId, mediaToken } = this.tickets.verifyDownload(ticket);
    const payload = this.files.verifyMediaToken(mediaToken, userId);
    try {
      await this.files.proxyToken(payload, res);
    } catch {
      if (!res.headersSent) {
        res.status(502).json({ error: "Failed to download file from upstream" });
      }
    }
  }

  private baseUrl(req: Request): string {
    return publicBaseUrl(this.config.get<string>("PUBLIC_BASE_URL"), req);
  }
}
