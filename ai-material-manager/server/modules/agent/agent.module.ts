import { Module } from "@nestjs/common";
import { FilesModule } from "@server/modules/files/files.module";
import { IdentityModule } from "@server/modules/identity/identity.module";
import { InboxModule } from "@server/modules/inbox/inbox.module";
import { MaterialsModule } from "@server/modules/materials/materials.module";
import { PoolModule } from "@server/modules/pool/pool.module";
import { PrereleaseModule } from "@server/modules/prerelease/prerelease.module";
import { AgentController } from "./agent.controller";
import { AgentTicketService } from "./agent-ticket.service";
import { AgentTokenService } from "./agent-token.service";
import { AgentUploadService } from "./agent-upload.service";
import { McpController } from "./mcp.controller";
import { McpServerFactory } from "./mcp-server.factory";

/** AI 助手接入：个人访问令牌、MCP 服务、Agent 上传/下载通道、Skill 下载 */
@Module({
  imports: [
    IdentityModule,
    MaterialsModule,
    PoolModule,
    InboxModule,
    FilesModule,
    PrereleaseModule,
  ],
  controllers: [AgentController, McpController],
  providers: [
    AgentTokenService,
    AgentTicketService,
    AgentUploadService,
    McpServerFactory,
  ],
})
export class AgentModule {}
