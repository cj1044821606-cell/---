import { HttpException, Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { IdentityService } from "@server/modules/identity/identity.service";
import { PeopleService } from "@server/modules/identity/people.service";
import { InboxService } from "@server/modules/inbox/inbox.service";
import { MaterialsService } from "@server/modules/materials/materials.service";
import { PoolService } from "@server/modules/pool/pool.service";
import {
  PrereleaseService,
  type UploadedFileRef,
} from "@server/modules/prerelease/prerelease.service";
import type { InboxCard, InboxCardType } from "@shared/inbox";
import type { MaterialListItem } from "@shared/material";
import {
  MATERIAL_TYPE_OPTIONS,
  NAMING_LANGUAGE_OPTIONS,
  parseGuidedNamingInput,
  type GuidedNamingInput,
} from "@shared/naming";
import {
  APPLICABLE_REGION_OPTIONS,
  MODIFY_REASON_OPTIONS,
  PRODUCT_LINE_OPTIONS,
  RISK_TAG_OPTIONS,
  UPDATE_VERSION_TYPE_OPTIONS,
} from "@shared/prerelease";
import type { AgentPrincipal } from "./agent-token.service";
import { AgentTicketService } from "./agent-ticket.service";
import { AgentUploadService } from "./agent-upload.service";
import { MCP_SERVER_NAME } from "./agent.constants";
import { absoluteUrl } from "./public-url";
import { buildUploadCommands } from "./upload-commands";

const MCP_SERVER_VERSION = "1.0.0";

const SERVER_INSTRUCTIONS = `传音储能物料管理系统（飞书多维表格为唯一数据源）。你以当前登录用户本人的身份操作。

上传即预发布（不经过 TClaw，几秒完成）：
1. 读懂用户的本地文件，整理命名信息（大类、型号、物料类型、语言、主区域市场码、版本号）和标记（产品线、适用区域、风险、是否允许外发）；
2. plan_material：得到查重后的标准命名；版本替换时传 replaceMaterialId（来自 search_materials），会给出建议版本号；
3. 对每个文件 prepare_upload（带 standardName 和 kind=M/L/S，文件会以“标准命名-M.pdf”这类标准文件名入库），在用户电脑上执行返回的命令；
4. get_upload_status 等全部 taskId 为 done；
5. 把命名、标记、审核人给用户过目并得到同意后，调用 publish_material。物料立即上线为“预发布”，所有人可正常下载；策划人及审核人在网页点“审核通过”后转为正式发布，驳回则下架。版本替换时旧版会立即下架并通知旧版领取人。
审核人必须指定：先用 find_people 拿 open_id。

跟进处理：list_my_tasks 查看待办（包括预发布被驳回的原因）；网页上传的文件仍由 TClaw 处理，其 AI 追问用 answer_ai_question、识别确认用 confirm_recognition（会直接生效，必须先得到用户明确同意）。
查找与下载：search_materials、get_material、get_material_files（下载链接 30 分钟内有效）。`;

const CARD_TYPE_LABEL: Record<InboxCardType, string> = {
  recognizing: "TClaw 识别中",
  aiAsk: "TClaw 在追问你，可用 answer_ai_question 回复",
  confirmRecognize: "等你确认 TClaw 的识别结果，可用 confirm_recognition",
  returned: "已退回，需要修改后重新上传",
  waitPublish: "等待发布",
  regionAudit: "等你做区域审核（请在网页处理）",
  versionReplaced: "你领取的物料出了新版本",
  problemHandle: "物料问题待处理（请在网页处理）",
  stuck: "流程卡住（维护者处理）",
  prereleaseReview: "有预发布物料等你审核（请在网页点审核按钮）",
  prereleaseRejected: "你预发布的物料被驳回，message 是驳回原因，修改后重新发布",
};

const namingShape = {
  category: z
    .enum(["product", "brand", "expo"])
    .describe("product=产品物料, brand=品牌物料, expo=展会物料"),
  productModel: z
    .string()
    .max(80)
    .optional()
    .describe("产品型号，照搬真实型号串（如 IPV-1K612U），产品物料必填"),
  materialType: z.enum(MATERIAL_TYPE_OPTIONS).optional().describe("物料类型"),
  language: z.enum(NAMING_LANGUAGE_OPTIONS).optional().describe("语言"),
  region: z
    .string()
    .max(20)
    .optional()
    .describe("命名用的主市场码，如 PK、NG；全球通用留空"),
  version: z.string().max(20).optional().describe("版本号，如 V1.0；首版为 V1.0"),
  brandOrExpoName: z
    .string()
    .max(80)
    .optional()
    .describe("品牌名（Logo 类）或展会简称（展会物料）"),
  eventYear: z.string().max(4).optional().describe("展会年份，四位数字"),
};

const openId = z.string().regex(/^ou_[A-Za-z0-9]+$/u);

const taskIdList = z
  .array(z.string().min(1).max(120))
  .max(20)
  .describe("prepare_upload 返回的 taskId，且状态已为 done");

interface ToolContext {
  principal: AgentPrincipal;
  baseUrl: string;
}

type ToolResult = CallToolResult;

function ok(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function fail(message: string): ToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

class ToolInputError extends Error {}

function errorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === "string") return response;
    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join("; ");
    if (typeof message === "string") return message;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/** 统一把业务异常转成 isError 结果，让 AI 助手能看到原因并自行纠正 */
function guarded<A>(
  handler: (args: A) => Promise<ToolResult>,
): (args: A) => Promise<ToolResult> {
  return async (args: A) => {
    try {
      return await handler(args);
    } catch (error) {
      return fail(errorMessage(error));
    }
  };
}

interface ToolConfig<S extends z.ZodRawShape> {
  title: string;
  description: string;
  inputSchema?: S;
  annotations?: ToolAnnotations;
}

/**
 * 直接调用 SDK 的 registerTool 泛型重载时，TypeScript 会在 zod v3/v4 兼容类型上做极深的推导
 * （本项目实测编译内存超过 8GB 仍失败）。这里用自己的签名约束参数类型，再以宽类型转交 SDK，
 * 运行时行为完全一致（SDK 依旧用同一份 zod shape 校验参数）。
 */
function registerTool<S extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  config: ToolConfig<S>,
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<ToolResult>,
): void {
  const register = server.registerTool.bind(server) as unknown as (
    toolName: string,
    toolConfig: ToolConfig<S>,
    callback: (args: z.infer<z.ZodObject<S>>) => Promise<ToolResult>,
  ) => void;
  register(name, config, guarded(handler));
}

function fileNameFromPath(localPath: string): string {
  return localPath.split(/[\\/]/u).filter(Boolean).pop() ?? localPath;
}

function extensionOf(fileName: string): string {
  const match = /\.[A-Za-z0-9]{1,10}$/u.exec(fileName);
  return match ? match[0].toLowerCase() : "";
}

function toNaming(value: unknown): GuidedNamingInput {
  const parsed = parseGuidedNamingInput(value);
  if (!parsed) throw new ToolInputError("命名信息格式不正确");
  return parsed;
}

/**
 * 为单个已认证用户构建 MCP 服务实例。
 * 采用无状态模式：每个 HTTP 请求新建一个实例，工具闭包里直接带上调用者身份，
 * 不存在跨用户共享的会话状态。
 */
@Injectable()
export class McpServerFactory {
  constructor(
    private readonly identity: IdentityService,
    private readonly people: PeopleService,
    private readonly materials: MaterialsService,
    private readonly pool: PoolService,
    private readonly inbox: InboxService,
    private readonly prerelease: PrereleaseService,
    private readonly tickets: AgentTicketService,
    private readonly uploads: AgentUploadService,
  ) {}

  create(ctx: ToolContext): McpServer {
    const server = new McpServer(
      { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
      { instructions: SERVER_INSTRUCTIONS },
    );
    this.registerAccountTools(server, ctx);
    this.registerLibraryTools(server, ctx);
    this.registerUploadTools(server, ctx);
    this.registerPublishTools(server, ctx);
    this.registerTaskTools(server, ctx);
    return server;
  }

  private registerAccountTools(server: McpServer, ctx: ToolContext): void {
    registerTool(
      server,
      "whoami",
      {
        title: "当前用户",
        description:
          "Return the logged-in user this connection acts as, their roles and whether they may upload.",
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => {
        const identity = await this.identity.resolve(ctx.principal.userId);
        return ok({
          name: ctx.principal.name,
          openId: identity.userId,
          roles: identity.roles,
          area: identity.area,
          isVisitor: identity.isVisitor,
          canUpload: identity.isUploadRole,
          webUrl: ctx.baseUrl,
        });
      },
    );

    registerTool(
      server,
      "find_people",
      {
        title: "搜索同事",
        description:
          "Search colleagues in the company directory by name, returning open_id for plannerAuditorOpenId / designerOpenId.",
        inputSchema: { query: z.string().min(1).max(100) },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ query }) => {
        const result = await this.people.listOptions(
          ctx.principal.userId,
          query,
        );
        return ok({
          items: result.items.map((person) => ({
            openId: person.openId,
            name: person.label,
            department: person.departmentName ?? null,
            role: person.roleText || null,
          })),
        });
      },
    );
  }

  private registerLibraryTools(server: McpServer, ctx: ToolContext): void {
    registerTool(
      server,
      "search_materials",
      {
        title: "搜索物料库",
        description:
          "Search published materials visible to the user. Filters are optional; results are paged (limit ≤ 50). isPrerelease=true means published by an AI assistant and awaiting the reviewer.",
        inputSchema: {
          keyword: z
            .string()
            .max(100)
            .optional()
            .describe("名称、标准命名、型号等关键词"),
          materialType: z
            .string()
            .max(60)
            .optional()
            .describe("物料类型，如 Datasheet 数据表"),
          region: z.string().max(20).optional(),
          productModel: z.string().max(80).optional(),
          externalOnly: z
            .boolean()
            .optional()
            .describe("只看允许对外发送的物料"),
          viewGlobal: z
            .boolean()
            .optional()
            .describe("查看全球物料（需要相应权限）"),
          offset: z.number().int().min(0).optional(),
          limit: z.number().int().min(1).max(50).optional(),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async (args) => {
        const offset = args.offset ?? 0;
        const result = await this.materials.listMaterials(ctx.principal.userId, {
          keyword: args.keyword,
          materialType: args.materialType,
          region: args.region,
          productModel: args.productModel,
          externalOnly: args.externalOnly === true,
          viewGlobal: args.viewGlobal === true,
          offset,
          limit: args.limit ?? 20,
        });
        const nextOffset = offset + result.items.length;
        return ok({
          total: result.total,
          nextOffset: nextOffset < result.total ? nextOffset : null,
          items: result.items.map((item) => this.summarize(item, ctx)),
        });
      },
    );

    registerTool(
      server,
      "get_material",
      {
        title: "物料详情",
        description:
          "Get one material with its version history. materialId comes from search_materials.",
        inputSchema: { materialId: z.string().min(1).max(64) },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ materialId }) => {
        const detail = await this.materials.getMaterialDetail(
          ctx.principal.userId,
          materialId,
        );
        const m = detail.material;
        return ok({
          ...this.summarize(m, ctx),
          materialCode: m.appMaterialId,
          plannerApprover: m.plannerApprover,
          designer: m.designer,
          publishTime: m.publishTime,
          newerVersionMaterialId:
            detail.banner?.mode === "oldVersion"
              ? detail.banner.newVersionMaterialId
              : null,
          versions: detail.versions.map((v) => ({
            versionNumber: v.versionNumber,
            versionType: v.versionType,
            versionStatus: v.versionStatus,
            isCurrent: v.isCurrentValid,
            publishTime: v.publishTime,
            changeSummary: v.aiComparisonSummary,
            modifyReason: v.modifyReason,
          })),
        });
      },
    );

    registerTool(
      server,
      "get_material_files",
      {
        title: "物料文件下载",
        description:
          "List downloadable files of a material (M=export/delivery, L=source, S=preview). downloadUrl works with plain curl for 30 minutes (curl -fL -o <name> <url>); external links open in Feishu.",
        inputSchema: { materialId: z.string().min(1).max(64) },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ materialId }) => {
        const result = await this.materials.getMaterialFiles(
          ctx.principal.userId,
          materialId,
        );
        return ok({
          materialId: result.materialId,
          versionNumber: result.versionNumber,
          missing: result.missing ?? {},
          files: result.files.map((file) => ({
            kind: file.kind,
            fileName: file.fileName,
            sizeBytes: file.sizeBytes,
            mimeType: file.mimeType,
            ...this.downloadLink(file.url, ctx),
          })),
        });
      },
    );
  }

  private registerUploadTools(server: McpServer, ctx: ToolContext): void {
    registerTool(
      server,
      "prepare_upload",
      {
        title: "准备上传文件",
        description:
          "Get a short-lived upload URL plus ready-to-run shell commands for ONE local file. Pass standardName (from plan_material) and kind so the file is stored under its standard file name. Run the command on the user's machine (bash on macOS/Linux, powershell on Windows), then poll get_upload_status.",
        inputSchema: {
          localPath: z
            .string()
            .min(1)
            .max(1024)
            .describe("文件在用户电脑上的完整路径（只用于生成命令，服务器不会读取）"),
          fileSize: z.number().int().positive().describe("文件字节数"),
          standardName: z
            .string()
            .max(200)
            .optional()
            .describe("plan_material 返回的标准命名"),
          kind: z
            .enum(["M", "L", "S"])
            .optional()
            .describe("M=导出件（PDF/JPG/MP4 等成品）, L=源文件（AI/PSD 等）, S=预览图"),
        },
        annotations: { readOnlyHint: false, openWorldHint: false },
      },
      async ({ localPath, fileSize, standardName, kind }) => {
        await this.assertCanUpload(ctx);
        const original = fileNameFromPath(localPath);
        if (standardName && !kind) {
          throw new ToolInputError("传了 standardName 时必须同时指定 kind（M/L/S）");
        }
        const fileName =
          standardName && kind
            ? `${standardName.trim()}-${kind}${extensionOf(original)}`
            : original;
        if (fileName.length > 255) {
          throw new ToolInputError("文件名过长（最多 255 个字符）");
        }
        const { ticket, upload } = this.tickets.issueUpload(
          ctx.principal.userId,
          fileName,
          fileSize,
        );
        const uploadUrl = `${ctx.baseUrl}/api/agent/uploads/${ticket}`;
        const chunkCount = this.tickets.chunkCount(fileSize);
        return ok({
          taskId: upload.uploadId,
          storedAs: upload.fileName,
          fileSize,
          expiresAt: new Date(upload.expiresAt).toISOString(),
          chunkSize: this.tickets.chunkBytes,
          chunkCount,
          commands: buildUploadCommands({
            uploadUrl,
            localPath,
            chunkSize: this.tickets.chunkBytes,
            chunkCount,
          }),
          next: "执行命令后用 get_upload_status 查询该 taskId，状态为 done 再发布。",
        });
      },
    );

    registerTool(
      server,
      "get_upload_status",
      {
        title: "查询上传进度",
        description:
          "Check upload tasks. status: receiving (file not fully sent yet), uploading (being stored to Feishu), done, failed.",
        inputSchema: {
          taskIds: z.array(z.string().min(1).max(120)).min(1).max(20),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ taskIds }) => {
        return ok({
          items: taskIds.map((taskId) => {
            const progress = this.uploads.status(ctx.principal.userId, taskId);
            if (!progress) {
              return {
                taskId,
                status: "receiving",
                hint: "服务器还没收齐这个文件：确认上传命令已成功执行；上传链接 2 小时后失效",
              };
            }
            return {
              taskId,
              status: progress.status,
              fileName: progress.fileName,
              totalSize: progress.totalSize,
              percent:
                progress.totalBlocks > 0
                  ? Math.round(
                      (progress.uploadedBlocks / progress.totalBlocks) * 100,
                    )
                  : 0,
              error: progress.error ?? null,
            };
          }),
        });
      },
    );
  }

  private registerPublishTools(server: McpServer, ctx: ToolContext): void {
    registerTool(
      server,
      "plan_material",
      {
        title: "规划命名与版本",
        description:
          "Validate naming info and return the de-duplicated standard name (the system appends -02, -03 on real conflicts). For a new version of an existing material pass replaceMaterialId to get its current version and suggested next version numbers. Read-only.",
        inputSchema: {
          naming: z.object(namingShape),
          replaceMaterialId: z
            .string()
            .max(64)
            .optional()
            .describe("要替换的旧物料 materialId（来自 search_materials）"),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ naming, replaceMaterialId }) => {
        const plan = await this.prerelease.plan({
          naming: toNaming(naming),
          replaceMaterialId,
        });
        return ok({
          ...plan,
          fileNameExamples: plan.standardName
            ? {
                M: `${plan.standardName}-M.pdf`,
                L: `${plan.standardName}-L.ai`,
                S: `${plan.standardName}-S.jpg`,
              }
            : null,
        });
      },
    );

    registerTool(
      server,
      "publish_material",
      {
        title: "预发布物料",
        description:
          "Publish a material immediately as PRE-RELEASE (downloadable by everyone; the planner/auditor must approve it in the web app to make it official). Writes the main record, version record and release record in one go. With replaceMaterialId the old version is taken down at once and its downloaders are notified. Only call after the user confirmed the naming, tags and reviewer.",
        inputSchema: {
          naming: z.object(namingShape).describe("与 plan_material 相同的命名信息，必须完整"),
          materialName: z
            .string()
            .min(1)
            .max(100)
            .describe("物料名称：给人看的中文名，如“1K612U 逆变器数据表（英文）”"),
          productLine: z.enum(PRODUCT_LINE_OPTIONS).optional(),
          regions: z
            .array(z.enum(APPLICABLE_REGION_OPTIONS))
            .min(1)
            .describe("适用区域（多选，照用户所说填全，不要用 GLOBAL 兜底）"),
          riskTags: z.array(z.enum(RISK_TAG_OPTIONS)).optional(),
          allowExternalSend: z.boolean().describe("是否允许发给公司外部客户"),
          recommended: z.boolean().optional().describe("是否推荐使用"),
          plannerAuditorOpenId: openId.describe(
            "策划人及审核人 open_id（find_people 获取），由他审核转正式发布",
          ),
          designerOpenId: openId.optional(),
          replaceMaterialId: z
            .string()
            .max(64)
            .optional()
            .describe("版本替换时的旧物料 materialId"),
          versionType: z
            .enum(UPDATE_VERSION_TYPE_OPTIONS)
            .optional()
            .describe("版本替换时：小改（V1.0→V1.1）/大改（→V2.0）/错误修复"),
          modifyReason: z.enum(MODIFY_REASON_OPTIONS).optional(),
          changeSummary: z
            .string()
            .max(4000)
            .optional()
            .describe("本版改动摘要（版本替换时对比新旧导出件后填写）"),
          releaseNote: z.string().max(2000).optional().describe("发布说明"),
          exportFiles: taskIdList.min(1).describe("导出件（M）的 taskId，至少一个"),
          sourceFiles: taskIdList.optional().describe("源文件（L）的 taskId"),
          previewFiles: taskIdList.optional().describe("预览图（S）的 taskId"),
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      async (args) => {
        await this.assertCanUpload(ctx);
        const userId = ctx.principal.userId;
        const result = await this.prerelease.publish(userId, {
          naming: toNaming(args.naming),
          materialName: args.materialName,
          productLine: args.productLine,
          regions: args.regions,
          riskTags: args.riskTags,
          allowExternalSend: args.allowExternalSend,
          recommended: args.recommended,
          plannerAuditorId: args.plannerAuditorOpenId,
          designerId: args.designerOpenId,
          replaceMaterialId: args.replaceMaterialId,
          versionType: args.versionType,
          modifyReason: args.modifyReason,
          changeSummary: args.changeSummary,
          releaseNote: args.releaseNote,
          exportFiles: this.resolveFiles(userId, args.exportFiles),
          sourceFiles: this.resolveFiles(userId, args.sourceFiles ?? []),
          previewFiles: this.resolveFiles(userId, args.previewFiles ?? []),
        });
        return ok({
          ...result,
          status: "预发布（已上线，可下载）",
          webUrl: `${ctx.baseUrl}/material/${encodeURIComponent(result.materialId)}`,
          next: result.replacedMaterialId
            ? "旧版已被替代并下架。策划人及审核人会收到审核提醒，通过后转为正式发布。"
            : "策划人及审核人会收到审核提醒，通过后转为正式发布。",
        });
      },
    );
  }

  private registerTaskTools(server: McpServer, ctx: ToolContext): void {
    registerTool(
      server,
      "list_my_tasks",
      {
        title: "我的待办",
        description:
          "List the user's to-do cards: pre-releases rejected by the reviewer (with the reason), pre-releases waiting for their review, and TClaw items for web uploads (questions, confirmations).",
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => {
        const { items } = await this.inbox.listForUser(ctx.principal.userId);
        return ok({
          items: items.map((card) => ({
            recordId: card.recordId,
            type: card.type,
            meaning: CARD_TYPE_LABEL[card.type],
            waitingDays: card.waitingDays,
            message: card.body || null,
            fields: Object.fromEntries(
              card.fields.map((f) => [f.labelKey.split(".").pop(), f.value]),
            ),
            progress: card.progress ?? null,
          })),
          webUrl: `${ctx.baseUrl}/inbox`,
        });
      },
    );

    registerTool(
      server,
      "answer_ai_question",
      {
        title: "回复 TClaw 追问",
        description:
          "Answer TClaw's follow-up question on one of the user's aiAsk cards (web uploads only). The record goes back to recognition.",
        inputSchema: {
          recordId: z.string().min(1).max(64),
          reply: z.string().min(1).max(2000),
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      async ({ recordId, reply }) => {
        await this.requireCard(ctx, recordId, "aiAsk");
        await this.pool.reply(recordId, reply.trim());
        return ok({ success: true, recordId, next: "已回复，TClaw 会重新识别。" });
      },
    );

    registerTool(
      server,
      "confirm_recognition",
      {
        title: "确认 TClaw 识别结果",
        description:
          "Act on a confirmRecognize card (web uploads only): publish, store (approve without publishing) or reject (return with a reason). Takes effect immediately — only call after the user explicitly chose the action.",
        inputSchema: {
          recordId: z.string().min(1).max(64),
          action: z.enum(["publish", "store", "reject"]),
          reason: z.string().max(2000).optional().describe("reject 时必填"),
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      async ({ recordId, action, reason }) => {
        const trimmed = reason?.trim();
        if (action === "reject" && !trimmed) {
          throw new ToolInputError("退回时必须填写原因 reason");
        }
        await this.requireCard(ctx, recordId, "confirmRecognize");
        await this.pool.confirm(recordId, action, trimmed);
        return ok({ success: true, recordId, action });
      },
    );
  }

  private summarize(item: MaterialListItem, ctx: ToolContext) {
    return {
      materialId: item.baseRecordId,
      name: item.materialName,
      standardName: item.standardName,
      materialType: item.materialType,
      productModel: item.productModel,
      productLine: item.productLine,
      language: item.appLanguage,
      regions: item.applicableRegion,
      currentVersion: item.currentVersion,
      releaseStatus: item.releaseStatus,
      isPrerelease: item.isPrerelease,
      versionStatus: item.versionStatus,
      externalSendAllowed: item.allowExternalSend,
      recommended: item.isRecommended,
      webUrl: `${ctx.baseUrl}/material/${encodeURIComponent(item.baseRecordId)}`,
    };
  }

  /** 站内下载链接依赖浏览器登录态；换成绑定用户的短时下载凭证，AI 助手可直接 curl */
  private downloadLink(
    url: string,
    ctx: ToolContext,
  ): { downloadUrl: string | null; linkType: "download" | "external" } {
    if (url.startsWith("/api/files/download?")) {
      const mediaToken = new URLSearchParams(url.split("?")[1]).get("token");
      if (mediaToken) {
        const ticket = this.tickets.issueDownload(
          ctx.principal.userId,
          mediaToken,
        );
        return {
          downloadUrl: `${ctx.baseUrl}/api/agent/downloads/${ticket}`,
          linkType: "download",
        };
      }
    }
    return { downloadUrl: absoluteUrl(ctx.baseUrl, url), linkType: "external" };
  }

  private resolveFiles(userId: string, taskIds: string[]): UploadedFileRef[] {
    return taskIds.map((taskId) => {
      const progress = this.uploads.status(userId, taskId);
      if (!progress) {
        throw new ToolInputError(
          `文件 ${taskId} 还没上传完成（服务器未收齐），请先执行上传命令`,
        );
      }
      if (progress.status === "failed") {
        throw new ToolInputError(
          `文件 ${progress.fileName} 上传失败：${progress.error ?? "未知错误"}，请重新 prepare_upload`,
        );
      }
      if (progress.status !== "done" || !progress.fileToken) {
        throw new ToolInputError(
          `文件 ${progress.fileName} 仍在转存飞书，请稍后用 get_upload_status 确认 done 再发布`,
        );
      }
      return { fileToken: progress.fileToken, size: progress.totalSize };
    });
  }

  private async assertCanUpload(ctx: ToolContext): Promise<void> {
    const identity = await this.identity.resolve(ctx.principal.userId);
    if (!identity.isUploadRole) {
      throw new ToolInputError(
        "你的账号没有上传权限（需要在人员配置表中有上传相关角色），请联系系统维护者",
      );
    }
  }

  /** 只允许处理出现在本人待办里的记录，防止 AI 助手误操作他人的记录 */
  private async requireCard(
    ctx: ToolContext,
    recordId: string,
    type: InboxCardType,
  ): Promise<InboxCard> {
    const { items } = await this.inbox.listForUser(ctx.principal.userId);
    const card = items.find((c) => c.recordId === recordId && c.type === type);
    if (!card) {
      throw new ToolInputError(
        `你的待办里没有这条“${CARD_TYPE_LABEL[type]}”记录，请先用 list_my_tasks 确认 recordId`,
      );
    }
    return card;
  }
}
