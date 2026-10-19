import type { Identity } from "./identity";

/**
 * AI 助手接入、令牌签发、组织成员搜索：人员表中的人，或已确认的储能事业部成员。
 * 部门未配置时 canAccess 对普通访客也为 true（沿用旧口径），这里不能只看 canAccess。
 */
export function canUseAgent(
  identity: Pick<Identity, "canAccess" | "isVisitor" | "isDivisionMember">,
): boolean {
  return identity.canAccess && (!identity.isVisitor || identity.isDivisionMember);
}

/** “未找到你的市场配置”横幅只给普通访客；事业部成员的访问是预期内的完整权限 */
export function showVisitorBanner(
  identity: Pick<Identity, "isVisitor" | "isDivisionMember">,
): boolean {
  return identity.isVisitor && !identity.isDivisionMember;
}

/** MCP 接入教程只对能上传的人自动弹出；其他人可在“更多”里手动打开 */
export function shouldAutoShowAgentTutorial(
  identity: Pick<Identity, "canAccess" | "isUploadRole">,
  seen: boolean,
): boolean {
  return identity.canAccess && identity.isUploadRole && !seen;
}

export type AccessBlock = "notInDivision" | "unverified";

/** 需要整页替换成“无访问权限 / 稍后重试”时返回原因 */
export function accessBlock(identity: Pick<Identity, "accessState">): AccessBlock | null {
  if (identity.accessState === "denied") return "notInDivision";
  if (identity.accessState === "unverified") return "unverified";
  return null;
}

export type AccessErrorCode = "NOT_IN_DIVISION" | "DEPARTMENT_UNAVAILABLE";

/** 从接口错误（GlobalExceptionFilter 格式 { error: { code } }）中识别访问权限类错误 */
export function accessErrorCode(status: number | undefined, data: unknown): AccessErrorCode | null {
  const code = (data as { error?: { code?: unknown } } | undefined)?.error?.code;
  if (status === 403 && code === "NOT_IN_DIVISION") return code;
  if (status === 503 && code === "DEPARTMENT_UNAVAILABLE") return code;
  return null;
}
