import type { Request } from "express";

function firstHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim() || undefined;
}

/**
 * 对外访问地址：优先使用部署配置 PUBLIC_BASE_URL；
 * 未配置时按反向代理（Cloudflare Tunnel）转发头推断，保证 AI 助手拿到的链接能直接访问。
 */
export function publicBaseUrl(configured: string | undefined, req: Request): string {
  const fromConfig = configured?.trim().replace(/\/+$/u, "");
  if (fromConfig) return fromConfig;
  const proto = firstHeader(req, "x-forwarded-proto") ?? req.protocol ?? "http";
  const host =
    firstHeader(req, "x-forwarded-host") ?? firstHeader(req, "host") ?? "localhost";
  return `${proto}://${host}`;
}

/** 把服务端返回的站内相对路径（/api/...）变成 AI 助手可直接访问的绝对地址 */
export function absoluteUrl(base: string, value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("/") ? `${base}${value}` : value;
}
