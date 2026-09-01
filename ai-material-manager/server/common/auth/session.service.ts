import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import type { SessionPayload, SessionUser } from "./session.types";

const SESSION_COOKIE = "am_session";
const STATE_COOKIE = "am_oauth_state";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthState {
  nonce: string;
  next: string;
  exp: number;
}

@Injectable()
export class SessionService {
  private readonly secret: string;
  private readonly secure: boolean;

  constructor(config: ConfigService) {
    this.secret = config.get<string>("SESSION_SECRET") ?? "";
    if (this.secret.length < 24) {
      throw new Error("SESSION_SECRET must contain at least 24 characters");
    }
    this.secure = (config.get<string>("PUBLIC_BASE_URL") ?? "").startsWith(
      "https://",
    );
  }

  createOAuthState(nextValue: string | undefined): string {
    const next = this.sanitizeNext(nextValue);
    return this.sign({
      nonce: randomBytes(18).toString("base64url"),
      next,
      exp: Date.now() + STATE_TTL_MS,
    });
  }

  verifyOAuthState(token: string | undefined): OAuthState {
    const payload = this.verify<OAuthState>(token);
    if (!payload || payload.exp < Date.now()) {
      throw new UnauthorizedException("OAuth state 无效或已过期");
    }
    return payload;
  }

  setOAuthStateCookie(res: Response, value: string): void {
    this.setCookie(res, STATE_COOKIE, value, STATE_TTL_MS);
  }

  readOAuthStateCookie(req: Request): string | undefined {
    return this.readCookie(req, STATE_COOKIE);
  }

  clearOAuthStateCookie(res: Response): void {
    this.clearCookie(res, STATE_COOKIE);
  }

  setSessionCookie(res: Response, user: SessionUser): void {
    const value = this.sign({ ...user, exp: Date.now() + SESSION_TTL_MS });
    this.setCookie(res, SESSION_COOKIE, value, SESSION_TTL_MS);
  }

  readSession(req: Request): SessionUser | null {
    const payload = this.verify<SessionPayload>(
      this.readCookie(req, SESSION_COOKIE),
    );
    if (!payload || payload.exp < Date.now() || !payload.userId) {
      return null;
    }
    return {
      userId: payload.userId,
      name: payload.name,
      avatarUrl: payload.avatarUrl,
    };
  }

  clearSessionCookie(res: Response): void {
    this.clearCookie(res, SESSION_COOKIE);
  }

  private sign(payload: object): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", this.secret)
      .update(body)
      .digest("base64url");
    return `${body}.${signature}`;
  }

  private verify<T>(token: string | undefined): T | null {
    if (!token) return null;
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra !== undefined) return null;
    const expected = createHmac("sha256", this.secret)
      .update(body)
      .digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, "base64url");
    } catch {
      return null;
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return null;
    }
    try {
      return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    } catch {
      return null;
    }
  }

  private setCookie(
    res: Response,
    name: string,
    value: string,
    maxAgeMs: number,
  ): void {
    const secure = this.secure ? "; Secure" : "";
    res.append(
      "Set-Cookie",
      `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure}`,
    );
  }

  private clearCookie(res: Response, name: string): void {
    const secure = this.secure ? "; Secure" : "";
    res.append(
      "Set-Cookie",
      `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    );
  }

  private readCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(";")) {
      const [rawKey, ...rawValue] = part.trim().split("=");
      if (rawKey === name) return rawValue.join("=");
    }
    return undefined;
  }

  private sanitizeNext(value: string | undefined): string {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return "/library";
    }
    return value;
  }
}
