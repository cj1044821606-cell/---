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
