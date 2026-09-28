import { All, Controller, Logger, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { AgentTokenService } from "./agent-token.service";
import { McpServerFactory } from "./mcp-server.factory";
import { publicBaseUrl } from "./public-url";

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/iu.exec(header.trim());
  return match?.[1]?.trim();
}

function jsonRpcError(res: Response, status: number, message: string): void {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: null,
  });
}

/**
 * MCP 服务入口（Streamable HTTP，无状态）。
 * 每个请求用 Authorization: Bearer <个人访问令牌> 认证，然后为该用户新建一个 MCP 实例处理。
 */
@Controller("mcp")
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tokens: AgentTokenService,
    private readonly factory: McpServerFactory,
  ) {}

  @Post()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const principal = this.tokens.authenticate(bearerToken(req));
    if (!principal) {
      res.setHeader(
        "WWW-Authenticate",
        'Bearer realm="materials", error="invalid_token"',
      );
      jsonRpcError(
        res,
        401,
        "未认证：请在物料系统网页“更多 → AI 助手接入”创建个人访问令牌，并以 Authorization: Bearer <令牌> 连接",
      );
      return;
    }

    const server = this.factory.create({
      principal,
      baseUrl: publicBaseUrl(this.config.get<string>("PUBLIC_BASE_URL"), req),
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.logger.error(
        `MCP request failed: user=${principal.userId} error=${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!res.headersSent) jsonRpcError(res, 500, "Internal server error");
    }
  }

  /** 无状态模式不提供 SSE 推送流和会话删除 */
  @All()
  methodNotAllowed(@Res() res: Response): void {
    res.setHeader("Allow", "POST");
    jsonRpcError(res, 405, "Method not allowed");
  }
}
