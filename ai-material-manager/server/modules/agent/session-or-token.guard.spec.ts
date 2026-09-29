import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { SessionService } from "@server/common/auth/session.service";
import { AgentTokenService } from "./agent-token.service";
import { SessionOrAgentTokenGuard } from "./session-or-token.guard";

function contextFor(req: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("SessionOrAgentTokenGuard", () => {
  let dir: string;
  let tokens: AgentTokenService;
  const alice = { userId: "ou_alice", name: "Alice", avatarUrl: null };

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "guard-"));
    tokens = new AgentTokenService(
      new ConfigService({ SESSION_SECRET: "s".repeat(32), AGENT_DATA_DIR: dir }),
    );
    await tokens.onModuleInit();
  });

  afterEach(async () => {
    await tokens.flush();
    for (const name of await fs.readdir(dir)) {
      await fs.unlink(path.join(dir, name));
    }
    await fs.rmdir(dir);
  });

  const guard = (session: typeof alice | null): SessionOrAgentTokenGuard =>
    new SessionOrAgentTokenGuard(
      { readSession: () => session } as unknown as SessionService,
      tokens,
    );

  it("accepts a web login session", () => {
    const req: Partial<Request> = { headers: {} };
    expect(guard(alice).canActivate(contextFor(req))).toBe(true);
    expect(req.userContext?.userId).toBe("ou_alice");
  });

  it("accepts a personal access token so an assistant can fetch the Skill itself", async () => {
    const { token } = await tokens.issue(alice, "codex", 90);
    const req: Partial<Request> = { headers: { authorization: `Bearer ${token}` } };
    expect(guard(null).canActivate(contextFor(req))).toBe(true);
    expect(req.userContext).toEqual(alice);
  });

  it("rejects missing, forged and revoked tokens", async () => {
    const { token, item } = await tokens.issue(alice, "codex", 90);
    const check = (authorization?: string): void => {
      guard(null).canActivate(
        contextFor({ headers: authorization ? { authorization } : {} }),
      );
    };
    expect(() => check()).toThrow(UnauthorizedException);
    expect(() => check(`Bearer ${token}x`)).toThrow(UnauthorizedException);
    await tokens.revoke("ou_alice", item.id);
    expect(() => check(`Bearer ${token}`)).toThrow(UnauthorizedException);
  });
});
