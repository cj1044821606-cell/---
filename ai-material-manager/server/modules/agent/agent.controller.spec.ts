import { ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import { AgentController } from "./agent.controller";

function controllerFor(identity: Record<string, unknown>) {
  const tokens = { issue: jest.fn(async () => ({ token: "amm_x" })) };
  const controller = new AgentController(
    {} as any,
    tokens as any,
    {} as any,
    {} as any,
    {} as any,
    { resolve: jest.fn(async () => identity) } as any,
  );
  const req = { userContext: { userId: "ou_a", name: "A", avatarUrl: null } } as unknown as Request;
  return { controller, tokens, req };
}

describe("AgentController.createToken", () => {
  it("事业部成员可签发令牌", async () => {
    const { controller, tokens, req } = controllerFor({
      isVisitor: true,
      canAccess: true,
      isDivisionMember: true,
    });
    await expect(controller.createToken(req, { label: "x" } as any)).resolves.toEqual({ token: "amm_x" });
    expect(tokens.issue).toHaveBeenCalled();
  });

  it("部门未配置时的普通访客不能签发令牌", async () => {
    const { controller, req } = controllerFor({
      isVisitor: true,
      canAccess: true,
      isDivisionMember: false,
    });
    await expect(controller.createToken(req, {} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("无访问权限者不能签发令牌", async () => {
    const { controller, req } = controllerFor({ isVisitor: true, canAccess: false });
    await expect(controller.createToken(req, {} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
