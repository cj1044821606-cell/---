import { accessBlock, accessErrorCode, shouldAutoShowAgentTutorial } from "@shared/access";

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

describe("accessErrorCode", () => {
  it("从过滤器格式的响应体读出业务码", () => {
    expect(accessErrorCode(403, { error: { code: "NOT_IN_DIVISION" } })).toBe("NOT_IN_DIVISION");
    expect(accessErrorCode(503, { error: { code: "DEPARTMENT_UNAVAILABLE" } })).toBe("DEPARTMENT_UNAVAILABLE");
  });
  it("状态码不匹配或普通错误返回 null", () => {
    expect(accessErrorCode(500, { error: { code: "NOT_IN_DIVISION" } })).toBeNull();
    expect(accessErrorCode(403, { error: { code: "FORBIDDEN" } })).toBeNull();
    expect(accessErrorCode(403, undefined)).toBeNull();
  });
});
