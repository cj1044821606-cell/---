import { getBitableAppToken } from "@server/common/constants/bitable.constants";

export const BITABLE_DEEP_LINK_HOST = "https://transsioner.feishu.cn";

export function buildBitableDeepLink(
  tableId: string,
  recordId: string,
): string {
  return `${BITABLE_DEEP_LINK_HOST}/base/${getBitableAppToken()}?table=${tableId}&record=${recordId}`;
}
