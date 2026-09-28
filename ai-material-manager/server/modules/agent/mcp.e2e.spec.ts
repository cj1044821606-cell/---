import { ConfigService } from "@nestjs/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { IdentityService } from "@server/modules/identity/identity.service";
import type { PeopleService } from "@server/modules/identity/people.service";
import type { InboxService } from "@server/modules/inbox/inbox.service";
import type { MaterialsService } from "@server/modules/materials/materials.service";
import type { PoolService } from "@server/modules/pool/pool.service";
import type { PrereleaseService } from "@server/modules/prerelease/prerelease.service";
import { AgentTicketService } from "./agent-ticket.service";
import { AgentTokenService } from "./agent-token.service";
import type { AgentUploadService } from "./agent-upload.service";
import { McpController } from "./mcp.controller";
import { McpServerFactory } from "./mcp-server.factory";

interface TextResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}

function text(result: unknown): string {
  return (result as TextResult).content[0]?.text ?? "";
}

describe("MCP endpoint (HTTP round trip)", () => {
  let dir: string;
  let server: Server;
  let baseUrl: string;
  let token: string;
  const publish = jest.fn();

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-e2e-"));
    const config = new ConfigService({
      SESSION_SECRET: "s".repeat(32),
      AGENT_DATA_DIR: dir,
      PUBLIC_BASE_URL: "https://materials.example.com",
    });
    const tokens = new AgentTokenService(config);
    await tokens.onModuleInit();
    token = (
      await tokens.issue({ userId: "ou_alice", name: "Alice", avatarUrl: null }, "e2e", 30)
    ).token;

    const identity = {
      resolve: jest.fn(async () => ({
        userId: "ou_alice",
        roles: ["设计师"],
        area: "HQ",
        isVisitor: false,
        isUploadRole: true,
        isMaintainer: false,
      })),
    } as unknown as IdentityService;
    const uploads = {
      status: jest.fn((_user: string, taskId: string) =>
        taskId === "done_task"
          ? { status: "done", fileName: "x-M.pdf", totalSize: 10, fileToken: "tok", uploadedBlocks: 1, totalBlocks: 1 }
          : undefined,
      ),
    } as unknown as AgentUploadService;
    publish.mockResolvedValue({
      materialId: "rec_new",
      versionRecordId: "rec_v",
      releaseRecordId: "rec_r",
      standardName: "IPV-1K612U-Datasheet-En-V1.0",
      version: "V1.0",
      replacedMaterialId: null,
    });
    const factory = new McpServerFactory(
      identity,
      {} as PeopleService,
      {} as MaterialsService,
      {} as PoolService,
      { listForUser: jest.fn(async () => ({ items: [] })) } as unknown as InboxService,
      { publish } as unknown as PrereleaseService,
      new AgentTicketService(config),
      uploads,
    );
    const controller = new McpController(config, tokens, factory);

    const app = express();
    app.use(express.json());
    app.post("/mcp", (req, res) => void controller.handle(req, res));
    app.all("/mcp", (_req, res) => controller.methodNotAllowed(res));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const name of await fs.readdir(dir)) {
      await fs.unlink(path.join(dir, name));
    }
    await fs.rmdir(dir);
  });

  const connect = async (bearer: string): Promise<Client> => {
    const client = new Client({ name: "jest", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${bearer}` } },
      }),
    );
    return client;
  };

  it("rejects requests without a valid token", async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Bearer");
    await expect(connect("amm_forged.token")).rejects.toThrow();
  });

  it("answers GET with 405 (stateless server, no SSE stream)", async () => {
    const response = await fetch(`${baseUrl}/mcp`);
    expect(response.status).toBe(405);
  });

  it("lists the fast-path tools and server instructions", async () => {
    const client = await connect(token);
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();
    expect(names).toEqual(
      [
        "answer_ai_question",
        "confirm_recognition",
        "find_people",
        "get_material",
        "get_material_files",
        "get_upload_status",
        "list_my_tasks",
        "plan_material",
        "prepare_upload",
        "publish_material",
        "search_materials",
        "whoami",
      ].sort(),
    );
    expect(client.getInstructions()).toContain("预发布");
    await client.close();
  });

  it("acts as the token owner and issues upload commands with the standard file name", async () => {
    const client = await connect(token);
    expect(JSON.parse(text(await client.callTool({ name: "whoami", arguments: {} })))).toMatchObject({
      name: "Alice",
      canUpload: true,
    });

    const prepared = JSON.parse(
      text(
        await client.callTool({
          name: "prepare_upload",
          arguments: {
            localPath: "C:\\Users\\alan\\Desktop\\datasheet final.pdf",
            fileSize: 1234,
            standardName: "IPV-1K612U-Datasheet-En-V1.0",
            kind: "M",
          },
        }),
      ),
    );
    expect(prepared.storedAs).toBe("IPV-1K612U-Datasheet-En-V1.0-M.pdf");
    expect(prepared.chunkCount).toBe(1);
    expect(prepared.commands.powershell).toContain(
      "https://materials.example.com/api/agent/uploads/",
    );
    await client.close();
  });

  it("returns readable tool errors and validates arguments", async () => {
    const client = await connect(token);
    const notUploaded = await client.callTool({
      name: "publish_material",
      arguments: {
        naming: { category: "product", productModel: "IPV-1K612U", materialType: "Datasheet 数据表", language: "EN", version: "V1.0" },
        materialName: "数据表",
        regions: ["AF 非洲"],
        allowExternalSend: false,
        plannerAuditorOpenId: "ou_planner",
        exportFiles: ["missing_task"],
      },
    });
    expect((notUploaded as TextResult).isError).toBe(true);
    expect(text(notUploaded)).toContain("还没上传完成");
    expect(publish).not.toHaveBeenCalled();

    const badRegion = await client.callTool({
      name: "publish_material",
      arguments: {
        naming: { category: "product" },
        materialName: "x",
        regions: ["火星"],
        allowExternalSend: false,
        plannerAuditorOpenId: "ou_planner",
        exportFiles: ["done_task"],
      },
    });
    expect((badRegion as TextResult).isError).toBe(true);

    const published = await client.callTool({
      name: "publish_material",
      arguments: {
        naming: { category: "product", productModel: "IPV-1K612U", materialType: "Datasheet 数据表", language: "EN", version: "V1.0" },
        materialName: "IPV-1K612U 数据表",
        regions: ["AF 非洲"],
        allowExternalSend: true,
        plannerAuditorOpenId: "ou_planner",
        exportFiles: ["done_task"],
      },
    });
    expect((published as TextResult).isError).toBeFalsy();
    expect(JSON.parse(text(published))).toMatchObject({
      materialId: "rec_new",
      webUrl: "https://materials.example.com/material/rec_new",
    });
    expect(publish).toHaveBeenCalledWith(
      "ou_alice",
      expect.objectContaining({
        exportFiles: [{ fileToken: "tok", size: 10 }],
        plannerAuditorId: "ou_planner",
      }),
    );
    await client.close();
  });
});
