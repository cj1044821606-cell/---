import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 与会话 Cookie 相同的 HMAC 签名格式：`base64url(JSON).签名`。
 * purpose 参与签名，保证 Agent 令牌、上传凭证、下载凭证之间不能互相冒用。
 */
export function signPayload(
  secret: string,
  purpose: string,
  payload: object,
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${purpose}:${body}`)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyPayload<T>(
  secret: string,
  purpose: string,
  token: string | undefined,
): T | null {
  if (!token) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = createHmac("sha256", secret)
    .update(`${purpose}:${body}`)
    .digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    );
    return parsed !== null && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}
