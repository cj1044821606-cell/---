import { buildMaterialShareUrl, copyText } from "@shared/share";

describe("buildMaterialShareUrl", () => {
  it("拼出物料详情页链接", () => {
    expect(buildMaterialShareUrl("https://materials.caojunaimcp.com", "recA")).toBe(
      "https://materials.caojunaimcp.com/material/recA",
    );
  });
  it("origin 结尾带斜杠时不出现双斜杠", () => {
    expect(buildMaterialShareUrl("https://m.example.com/", "recA")).toBe(
      "https://m.example.com/material/recA",
    );
  });
  it("ID 中的特殊字符会被编码", () => {
    expect(buildMaterialShareUrl("https://m.example.com", "rec/A?b")).toBe(
      "https://m.example.com/material/rec%2FA%3Fb",
    );
  });
});

describe("copyText", () => {
  it("剪贴板成功返回 true", async () => {
    const writeText = jest.fn(async () => undefined);
    await expect(copyText("x", { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("x");
  });
  it("剪贴板拒绝返回 false 且不抛错", async () => {
    await expect(
      copyText("x", { writeText: async () => Promise.reject(new Error("denied")) }),
    ).resolves.toBe(false);
  });
  it("没有剪贴板返回 false", async () => {
    await expect(copyText("x", undefined)).resolves.toBe(false);
  });
});
