import { ConfigService } from "@nestjs/config";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  AgentTokenService,
  MAX_ACTIVE_TOKENS_PER_USER,
} from "./agent-token.service";

const user = { userId: "ou_alice", name: "Alice", avatarUrl: null };

describe("AgentTokenService", () => {
  let dir: string;
  let config: ConfigService;

  const created: AgentTokenService[] = [];
  const create = async (): Promise<AgentTokenService> => {
    const service = new AgentTokenService(config);
    await service.onModuleInit();
    created.push(service);
    return service;
  };

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-token-"));
    config = new ConfigService({
      SESSION_SECRET: "s".repeat(32),
      AGENT_DATA_DIR: dir,
    });
  });

  afterEach(async () => {
    // 先等后台写入完成，避免删目录时还有临时文件在写
    await Promise.all(created.splice(0).map((service) => service.flush()));
    // 逐个删除本测试生成的文件，再删除空目录，不做递归删除
    for (const name of await fs.readdir(dir)) {
      await fs.unlink(path.join(dir, name));
    }
    await fs.rmdir(dir);
  });

  it("issues a token that authenticates as its owner", async () => {
    const service = await create();
    const { token, item } = await service.issue(user, "My laptop", 90);

    expect(token.startsWith("amm_")).toBe(true);
    expect(item.label).toBe("My laptop");
    expect(service.authenticate(token)).toMatchObject({
      userId: "ou_alice",
      name: "Alice",
      tokenId: item.id,
    });
    expect(service.list("ou_alice")).toHaveLength(1);
    expect(service.list("ou_bob")).toHaveLength(0);
  });

  it("rejects tampered, foreign-purpose and malformed tokens", async () => {
    const service = await create();
    const { token } = await service.issue(user, "laptop", 30);

    expect(service.authenticate(`${token}x`)).toBeNull();
    expect(service.authenticate(token.replace("amm_", ""))).toBeNull();
    expect(service.authenticate(undefined)).toBeNull();
    expect(service.authenticate("amm_not.a-token")).toBeNull();

    const otherSecret = new AgentTokenService(
      new ConfigService({ SESSION_SECRET: "x".repeat(32), AGENT_DATA_DIR: dir }),
    );
    await otherSecret.onModuleInit();
    expect(otherSecret.authenticate(token)).toBeNull();
  });

  it("stops authenticating after revoke, and survives a restart", async () => {
    const service = await create();
    const { token, item } = await service.issue(user, "laptop", 30);

    const restarted = await create();
    expect(restarted.authenticate(token)?.userId).toBe("ou_alice");

    await expect(restarted.revoke("ou_bob", item.id)).rejects.toThrow();
    await restarted.revoke("ou_alice", item.id);
    expect(restarted.authenticate(token)).toBeNull();
    expect((await create()).authenticate(token)).toBeNull();
  });

  it("expires tokens after their TTL", async () => {
    const service = await create();
    const { token } = await service.issue(user, "laptop", 30);
    const now = Date.now();
    const spy = jest
      .spyOn(Date, "now")
      .mockReturnValue(now + 31 * 24 * 60 * 60 * 1000);
    try {
      expect(service.authenticate(token)).toBeNull();
      expect(service.list("ou_alice")).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("validates label, TTL and the per-user limit", async () => {
    const service = await create();
    await expect(service.issue(user, "", 30)).rejects.toThrow();
    await expect(service.issue(user, "x".repeat(41), 30)).rejects.toThrow();
    await expect(service.issue(user, "ok", 7)).rejects.toThrow();

    for (let i = 0; i < MAX_ACTIVE_TOKENS_PER_USER; i += 1) {
      await service.issue(user, `device ${i}`, 30);
    }
    await expect(service.issue(user, "one too many", 30)).rejects.toThrow(
      /最多/u,
    );
  });

  it("keeps the app up on a corrupted store and preserves the bad file for inspection", async () => {
    await fs.writeFile(path.join(dir, "tokens.json"), "{not json");
    const service = await create();
    expect(service.list("ou_alice")).toEqual([]);
    const files = await fs.readdir(dir);
    expect(files.some((name) => name.startsWith("tokens.json.corrupt-"))).toBe(true);
    await service.issue(user, "fresh", 30);
    expect(service.list("ou_alice")).toHaveLength(1);
  });
});
