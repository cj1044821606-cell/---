import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { AccessState } from "@shared/identity";
import { DivisionAccessGuard } from "./division-access.guard";

function guardFor(accessState: AccessState) {
  const identity = { resolve: jest.fn(async () => ({ accessState })) };
  const guard = new DivisionAccessGuard(identity as any);
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ userContext: { userId: "ou_a" } }) }),
  } as unknown as ExecutionContext;
  return { guard, ctx };
}

describe("DivisionAccessGuard", () => {
  it("granted 放行", async () => {
    const { guard, ctx } = guardFor("granted");
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("denied 返回 403 NOT_IN_DIVISION", async () => {
    const { guard, ctx } = guardFor("denied");
    const error = await guard.canActivate(ctx).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: "NOT_IN_DIVISION",
      message: "本系统仅对储能事业部开放",
    });
  });

  it("unverified 返回 503 DEPARTMENT_UNAVAILABLE", async () => {
    const { guard, ctx } = guardFor("unverified");
    const error = await guard.canActivate(ctx).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
      code: "DEPARTMENT_UNAVAILABLE",
      message: "暂时无法验证部门，请稍后重试",
    });
  });
});
