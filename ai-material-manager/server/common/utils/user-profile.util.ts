import { eq, sql, type Column, type SQL } from "drizzle-orm";

/**
 * user_profile[] 数组字段包含匹配（预验证结论）：
 * WHERE EXISTS (SELECT 1 FROM unnest(col) p WHERE (p).user_id = $1)
 */
export function userInArray(column: Column, userId: string): SQL {
  return sql`EXISTS (SELECT 1 FROM unnest(${column}) p WHERE (p).user_id = ${userId})`;
}

/**
 * 单值 user_profile 字段匹配（预验证结论：Drizzle eq() 直接可用）。
 */
export function userEquals(column: Column, userId: string): SQL {
  return eq(column, userId);
}
