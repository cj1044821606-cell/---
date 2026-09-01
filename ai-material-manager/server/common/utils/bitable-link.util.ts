/**
 * 多维表格关联 jsonb 字段防御解析。
 * 已验证结构：{"link_record_ids": string[] | null}（现存数据多为 null），
 * 仅提取字符串元素，任何异常形态一律返回空数组。
 */
export function extractLinkRecordIds(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const ids: unknown = record["link_record_ids"];
  if (!Array.isArray(ids)) return [];
  return ids.filter((id: unknown): id is string => typeof id === "string");
}
