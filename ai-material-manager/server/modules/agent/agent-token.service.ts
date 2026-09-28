import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { SessionUser } from "@server/common/auth/session.types";
import {
  AGENT_TOKEN_TTL_OPTIONS,
  type AgentTokenItem,
  type AgentTokenTtlDays,
} from "@shared/agent";
import { signPayload, verifyPayload } from "./signing";

const TOKEN_PREFIX = "amm_";
const TOKEN_PURPOSE = "agent-token:v1";
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_ACTIVE_TOKENS_PER_USER = 10;
/** 最近使用时间只用于展示，不必每次调用都落盘 */
const LAST_USED_PERSIST_INTERVAL_MS = 10 * 60 * 1000;
/** 已吊销/已过期的记录保留一段时间再清理，便于排查 */
const PRUNE_AFTER_MS = 30 * DAY_MS;

interface StoredToken {
  id: string;
  userId: string;
  userName: string;
  label: string;
  createdAt: number;
  expiresAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
}

interface TokenStoreFile {
  version: 1;
  tokens: StoredToken[];
}

interface TokenPayload {
  id: string;
  uid: string;
  exp: number;
}

export interface AgentPrincipal extends SessionUser {
  tokenId: string;
}

/**
 * 个人访问令牌：让本机 AI 助手以用户本人身份调用 MCP。
 * - 令牌本身带 HMAC 签名，服务端只保存编号与元数据，不保存明文；
 * - 吊销、过期、最近使用时间保存在上传卷内的 JSON 文件中（与缩略图同样持久化）。
 */
@Injectable()
export class AgentTokenService implements OnModuleInit {
  private readonly logger = new Logger(AgentTokenService.name);
  private readonly secret: string;
  private readonly storePath: string;
  private tokens: StoredToken[] = [];
  private writeChain: Promise<void> = Promise.resolve();

  constructor(config: ConfigService) {
    this.secret = config.get<string>("SESSION_SECRET") ?? "";
    const uploadDir =
      config.get<string>("UPLOAD_DIR") ?? path.resolve("var/uploads");
    const dataDir =
      config.get<string>("AGENT_DATA_DIR") ?? path.join(uploadDir, "agent");
    this.storePath = path.join(dataDir, "tokens.json");
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    try {
      const raw = JSON.parse(
        await fs.readFile(this.storePath, "utf8"),
      ) as Partial<TokenStoreFile>;
      this.tokens = Array.isArray(raw.tokens) ? raw.tokens : [];
    } catch (error) {
      this.tokens = [];
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      // 令牌文件损坏：不能拖垮整个物料系统，也不能静默覆盖。
      // 把坏文件改名留存以便排查，从空列表启动；用户重新创建令牌即可。
      const aside = `${this.storePath}.corrupt-${Date.now()}`;
      await fs.rename(this.storePath, aside).catch(() => undefined);
      this.logger.error(
        `Agent token store unreadable, moved to ${aside}; all assistant tokens must be recreated: ${String(error)}`,
      );
    }
  }

  list(userId: string): AgentTokenItem[] {
    const now = Date.now();
    return this.tokens
      .filter((t) => t.userId === userId && this.isActive(t, now))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toItem);
  }

  async issue(
    user: SessionUser,
    labelRaw: unknown,
    ttlDaysRaw: unknown,
  ): Promise<{ token: string; item: AgentTokenItem }> {
    const label = typeof labelRaw === "string" ? labelRaw.trim() : "";
    if (label.length === 0 || label.length > 40) {
      throw new BadRequestException("请填写 1-40 个字的令牌名称");
    }
    const ttlDays = Number(ttlDaysRaw) as AgentTokenTtlDays;
    if (!AGENT_TOKEN_TTL_OPTIONS.includes(ttlDays)) {
      throw new BadRequestException("有效期只能是 30、90 或 180 天");
    }
    const now = Date.now();
    const active = this.tokens.filter(
      (t) => t.userId === user.userId && this.isActive(t, now),
    );
    if (active.length >= MAX_ACTIVE_TOKENS_PER_USER) {
      throw new BadRequestException(
        `每人最多同时保留 ${MAX_ACTIVE_TOKENS_PER_USER} 个令牌，请先吊销不用的`,
      );
    }

    const stored: StoredToken = {
      id: randomBytes(9).toString("base64url"),
      userId: user.userId,
      userName: user.name,
      label,
      createdAt: now,
      expiresAt: now + ttlDays * DAY_MS,
      lastUsedAt: null,
      revokedAt: null,
    };
    const token =
      TOKEN_PREFIX +
      signPayload(this.secret, TOKEN_PURPOSE, {
        id: stored.id,
        uid: stored.userId,
        exp: stored.expiresAt,
      } satisfies TokenPayload);

    this.tokens.push(stored);
    await this.persist();
    this.logger.log(`Agent token issued: id=${stored.id} user=${user.userId}`);
    return { token, item: toItem(stored) };
  }

  async revoke(userId: string, id: string): Promise<void> {
    const stored = this.tokens.find(
      (t) => t.id === id && t.userId === userId && t.revokedAt === null,
    );
    if (!stored) throw new NotFoundException("令牌不存在或已吊销");
    stored.revokedAt = Date.now();
    await this.persist();
    this.logger.log(`Agent token revoked: id=${id} user=${userId}`);
  }

  /** 校验 Authorization: Bearer 令牌；无效时返回 null，由调用方统一回 401 */
  authenticate(token: string | undefined): AgentPrincipal | null {
    if (!token?.startsWith(TOKEN_PREFIX)) return null;
    const payload = verifyPayload<TokenPayload>(
      this.secret,
      TOKEN_PURPOSE,
      token.slice(TOKEN_PREFIX.length),
    );
    if (!payload || typeof payload.id !== "string") return null;
    const now = Date.now();
    const stored = this.tokens.find((t) => t.id === payload.id);
    if (!stored || stored.userId !== payload.uid || !this.isActive(stored, now)) {
      return null;
    }
    if (
      stored.lastUsedAt === null ||
      now - stored.lastUsedAt > LAST_USED_PERSIST_INTERVAL_MS
    ) {
      stored.lastUsedAt = now;
      void this.persist().catch((error: unknown) =>
        this.logger.warn(`Persist lastUsedAt failed: ${String(error)}`),
      );
    }
    return {
      userId: stored.userId,
      name: stored.userName,
      avatarUrl: null,
      tokenId: stored.id,
    };
  }

  /** 等待后台写入（最近使用时间）落盘，用于测试和优雅退出 */
  async flush(): Promise<void> {
    await this.writeChain;
  }

  private isActive(token: StoredToken, now: number): boolean {
    return token.revokedAt === null && token.expiresAt > now;
  }

  /** 串行写入临时文件再改名，避免并发写坏或断电留下半个文件 */
  private persist(): Promise<void> {
    const run = async (): Promise<void> => {
      const now = Date.now();
      this.tokens = this.tokens.filter(
        (t) => (t.revokedAt ?? t.expiresAt) > now - PRUNE_AFTER_MS,
      );
      const data: TokenStoreFile = { version: 1, tokens: this.tokens };
      const tmp = `${this.storePath}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data), { mode: 0o600 });
      await fs.rename(tmp, this.storePath);
    };
    const next = this.writeChain.then(run, run);
    this.writeChain = next.catch(() => undefined);
    return next;
  }
}

function toItem(token: StoredToken): AgentTokenItem {
  return {
    id: token.id,
    label: token.label,
    createdAt: new Date(token.createdAt).toISOString(),
    expiresAt: new Date(token.expiresAt).toISOString(),
    lastUsedAt:
      token.lastUsedAt === null ? null : new Date(token.lastUsedAt).toISOString(),
  };
}
