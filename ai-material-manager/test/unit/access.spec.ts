import { accessBlock, shouldAutoShowAgentTutorial } from "@shared/access";

describe("shouldAutoShowAgentTutorial", () => {
  it("能上传且未看过时自动弹出", () => {
    expect(shouldAutoShowAgentTutorial({ canAccess: true, isUploadRole: true }, false)).toBe(true);
  });
  it("看过就不再弹", () => {
    expect(shouldAutoShowAgentTutorial({ canAccess: true, isUploadRole: true }, true)).toBe(false);
  });
  it("不能上传的人不自动弹", () => {
    expect(shouldAutoShowAgentTutorial({ canAccess: true, isUploadRole: false }, false)).toBe(false);
  });
  it("无访问权限不弹", () => {
    expect(shouldAutoShowAgentTutorial({ canAccess: false, isUploadRole: true }, false)).toBe(false);
  });
});

describe("accessBlock", () => {
  it("granted 不拦截", () => {
    expect(accessBlock({ accessState: "granted" })).toBeNull();
  });
  it("denied 显示无权限", () => {
    expect(accessBlock({ accessState: "denied" })).toBe("notInDivision");
  });
  it("unverified 显示稍后重试", () => {
    expect(accessBlock({ accessState: "unverified" })).toBe("unverified");
  });
});
