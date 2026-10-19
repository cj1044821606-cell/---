/** 站内物料详情页链接：只对储能事业部内部有效，打开时需要飞书登录 */
export function buildMaterialShareUrl(origin: string, baseRecordId: string): string {
  return `${origin.replace(/\/+$/u, "")}/material/${encodeURIComponent(baseRecordId)}`;
}

/** 写剪贴板；飞书内置浏览器等环境可能不支持，失败时返回 false 交给调用方兜底 */
export async function copyText(
  text: string,
  clipboard: { writeText(text: string): Promise<void> } | undefined,
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
