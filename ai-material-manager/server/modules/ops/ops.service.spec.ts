import type { DepartmentCheck } from "@server/modules/identity/department.service";
import { OpsService } from "./ops.service";

function opsFor(config: { accessIds: string[]; uploadIds: string[] }, check: DepartmentCheck) {
  const base = { rows: jest.fn(async () => []) };
  const identity = { resolve: jest.fn(async () => ({ isMaintainer: true })) };
  const settings = {
    getSettings: jest.fn(async () => ({ groupQrStatus: "available", groupQrExpiry: null })),
  };
  const departments = {
    configStatus: jest.fn(async () => config),
    check: jest.fn(async () => check),
  };
  return new OpsService(base as any, identity as any, settings as any, departments as any);
}

describe("OpsService.departmentAlert", () => {
  it("未配置时返回 unconfigured", async () => {
    const ops = opsFor({ accessIds: [], uploadIds: [] }, { state: "unconfigured" });
    await expect(ops.getOps("ou_m")).resolves.toMatchObject({
      departmentAlert: { status: "unconfigured", accessCount: 0, uploadCount: 0 },
    });
  });

  it("配置存在但读取部门失败返回 failed", async () => {
    const ops = opsFor(
      { accessIds: ["od-ess"], uploadIds: ["od-mkt"] },
      { state: "failed", reason: "code=99991672" },
    );
    await expect(ops.getOps("ou_m")).resolves.toMatchObject({
      departmentAlert: { status: "failed", accessCount: 1, uploadCount: 1 },
    });
  });

  it("维护者本人不在配置的事业部内时告警（部门 ID 可能填错）", async () => {
    const ops = opsFor(
      { accessIds: ["od-typo"], uploadIds: ["od-mkt"] },
      { state: "ok", inDivision: false, inMarketing: false },
    );
    await expect(ops.getOps("ou_m")).resolves.toMatchObject({
      departmentAlert: { status: "mismatch" },
    });
  });

  it("正常时返回 ok 与配置数量", async () => {
    const ops = opsFor(
      { accessIds: ["od-ess", "od-ess2"], uploadIds: ["od-mkt"] },
      { state: "ok", inDivision: true, inMarketing: true },
    );
    await expect(ops.getOps("ou_m")).resolves.toMatchObject({
      departmentAlert: { status: "ok", accessCount: 2, uploadCount: 1 },
    });
  });
});
