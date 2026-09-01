import {
  decodeAttachmentLocator,
  encodeAttachmentLocator,
} from "./attachment-locator.util";

describe("attachment locator", () => {
  it("round-trips a Feishu token without exposing a download URL", () => {
    const locator = encodeAttachmentLocator({
      fileToken: "boxcn-test-token",
      fileName: "产品图.png",
    });

    expect(locator.startsWith("feishu-media:")).toBe(true);
    expect(decodeAttachmentLocator(locator)).toEqual({
      fileToken: "boxcn-test-token",
      fileName: "产品图.png",
    });
  });

  it("rejects malformed locators", () => {
    expect(decodeAttachmentLocator("https://example.com/file")).toBeNull();
    expect(decodeAttachmentLocator("feishu-media:not-json")).toBeNull();
  });
});
