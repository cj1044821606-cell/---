import { FeishuBaseGateway } from "./feishu-base.gateway";

describe("FeishuBaseGateway parsing contracts", () => {
  const gateway = Object.create(
    FeishuBaseGateway.prototype,
  ) as FeishuBaseGateway;

  it("extracts nested mention links returned by records/search", () => {
    const parse = (
      gateway as unknown as { toMentionLinks(value: unknown): string | null }
    ).toMentionLinks.bind(gateway);
    const value = [
      {
        type: "mention",
        mention: {
          token: "boxcn123",
          name: "asset.ai",
          link: "https://transsioner.feishu.cn/file/boxcn123",
        },
      },
    ];

    expect(parse(value)).toBe(
      "https://transsioner.feishu.cn/file/boxcn123",
    );
  });

  it("keeps attachment file_token and original filename together", () => {
    const parse = (
      gateway as unknown as { toAttachments(value: unknown): string[] }
    ).toAttachments.bind(gateway);
    const [locator] = parse([
      { file_token: "boxcn-file", name: "source.ai", size: 100 },
    ]);

    expect(locator).toContain("feishu-media:");
    expect(locator).not.toContain("open.feishu.cn/open-apis/drive");
  });
});

describe("FeishuBaseGateway stale-while-revalidate", () => {
  function createGateway(fetchRows: jest.Mock): FeishuBaseGateway {
    const gateway = Object.create(FeishuBaseGateway.prototype) as FeishuBaseGateway;
    Object.assign(gateway, {
      cache: new Map(),
      inFlight: new Map(),
      logger: { warn: jest.fn() },
      fetchRows,
    });
    return gateway;
  }

  function seed(gateway: FeishuBaseGateway, rows: unknown[], expiresAt: number): void {
    (gateway as unknown as { cache: Map<string, unknown> }).cache.set("main", {
      expiresAt,
      rows,
    });
  }

  it("returns stale rows immediately and refreshes in the background", async () => {
    const fetchRows = jest.fn(async () => [{ baseRecordId: "fresh" }]);
    const gateway = createGateway(fetchRows);
    seed(gateway, [{ baseRecordId: "stale" }], Date.now() - 1_000);

    const rows = await gateway.rows("main", { maxStaleMs: 60_000 });
    expect(rows).toEqual([{ baseRecordId: "stale" }]);
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });

  it("waits for fresh rows without maxStaleMs or beyond the stale window", async () => {
    const fetchRows = jest.fn(async () => [{ baseRecordId: "fresh" }]);
    const gateway = createGateway(fetchRows);
    seed(gateway, [{ baseRecordId: "stale" }], Date.now() - 1_000);
    await expect(gateway.rows("main")).resolves.toEqual([{ baseRecordId: "fresh" }]);

    seed(gateway, [{ baseRecordId: "stale" }], Date.now() - 120_000);
    await expect(gateway.rows("main", { maxStaleMs: 60_000 })).resolves.toEqual([
      { baseRecordId: "fresh" },
    ]);
  });
});
