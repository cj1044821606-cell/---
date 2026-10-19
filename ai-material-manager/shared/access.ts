import type { Identity } from "./identity";

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
