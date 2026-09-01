import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { SessionService } from "./session.service";

describe("SessionService", () => {
  const service = new SessionService(
    new ConfigService({
      SESSION_SECRET: "test-secret-at-least-24-characters-long",
      PUBLIC_BASE_URL: "https://materials.example.com",
    }),
  );

  it("signs and reads a user session cookie", () => {
    const headers: string[] = [];
    const response = {
      append: (_name: string, value: string) => headers.push(value),
    } as unknown as Response;
    service.setSessionCookie(response, {
      userId: "ou_test",
      name: "Alan",
      avatarUrl: null,
    });
    const cookie = headers[0].split(";")[0];
    const request = { headers: { cookie } } as Request;

    expect(service.readSession(request)).toEqual({
      userId: "ou_test",
      name: "Alan",
      avatarUrl: null,
    });
    expect(headers[0]).toContain("HttpOnly");
    expect(headers[0]).toContain("Secure");
  });

  it("rejects tampered session cookies and unsafe return paths", () => {
    const state = service.createOAuthState("//evil.example");
    expect(service.verifyOAuthState(state).next).toBe("/library");
    const request = {
      headers: { cookie: `am_session=${state}x` },
    } as Request;
    expect(service.readSession(request)).toBeNull();
  });
});
