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
