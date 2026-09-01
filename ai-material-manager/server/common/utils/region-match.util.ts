export const GLOBAL_REGION_CODE: string = "GLOBAL";

/**
 * 多维表格区域字段为「码+名称」形态（如 "GLOBAL 全球" / "HQ-总部"），
 * 用户市场码是纯码（HQ/PK/UZ…），需按前缀匹配而非精确相等。
 */
export function regionElementMatches(
  element: string,
  code: string,
): boolean {
  const normalizedElement: string = element.trim();
  const normalizedCode: string = code.trim();
  if (normalizedCode.length === 0) return false;
  return (
    normalizedElement === normalizedCode ||
    normalizedElement.startsWith(`${normalizedCode} `) ||
    normalizedElement.startsWith(`${normalizedCode}-`)
  );
}

export function regionsIncludeCode(
  regions: string[],
  code: string,
): boolean {
  return regions.some((element: string) =>
    regionElementMatches(element, code),
  );
}

/** 物料适用区域是否覆盖目标市场（GLOBAL 对所有市场可见） */
export function areaVisibleInRegions(
  regions: string[],
  area: string | null,
): boolean {
  if (regionsIncludeCode(regions, GLOBAL_REGION_CODE)) return true;
  return area !== null && regionsIncludeCode(regions, area);
}
