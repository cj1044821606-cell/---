import { accessBlock, accessErrorCode, canUseAgent, shouldAutoShowAgentTutorial, showVisitorBanner } from "@shared/access";

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

describe("canUseAgent", () => {
  it("人员表中的人可以使用", () => {
    expect(canUseAgent({ canAccess: true, isVisitor: false, isDivisionMember: false })).toBe(true);
  });
  it("已确认的事业部成员可以使用", () => {
    expect(canUseAgent({ canAccess: true, isVisitor: true, isDivisionMember: true })).toBe(true);
  });
  it("部门未配置时的普通访客不能使用", () => {
    expect(canUseAgent({ canAccess: true, isVisitor: true, isDivisionMember: false })).toBe(false);
  });
  it("无访问权限不能使用", () => {
    expect(canUseAgent({ canAccess: false, isVisitor: false, isDivisionMember: false })).toBe(false);
  });
});

describe("showVisitorBanner", () => {
  it("普通访客显示“未找到市场配置”横幅", () => {
    expect(showVisitorBanner({ isVisitor: true, isDivisionMember: false })).toBe(true);
  });
  it("事业部成员不显示", () => {
    expect(showVisitorBanner({ isVisitor: true, isDivisionMember: true })).toBe(false);
  });
  it("人员表中的人不显示", () => {
    expect(showVisitorBanner({ isVisitor: false, isDivisionMember: false })).toBe(false);
  });
});
