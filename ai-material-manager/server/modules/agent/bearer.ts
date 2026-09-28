import type { Request } from 'express';

/** 取出 Authorization: Bearer <令牌> 里的令牌 */
export function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/iu.exec(header.trim());
  return match?.[1]?.trim();
}
