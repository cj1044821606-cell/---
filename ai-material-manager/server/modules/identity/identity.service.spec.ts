import type { DepartmentCheck } from "./department.service";
import { IdentityService } from "./identity.service";

function memoryCache() {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
}

function makeService(roleText: string | null, check: DepartmentCheck, area = "HQ-总部") {
  const people = roleText
    ? [{ baseRecordId: "rec1", text: roleText, appPerson: ["ou_a"], areaIdentifier: area }]
    : [];
  const base = {
    rows: jest.fn(async (table: string) => (table === "people" ? people : [])),
  };
  const departments = { check: jest.fn(async () => check) };
  const service = new IdentityService(base as any, memoryCache() as any, departments as any);
  return { service, departments };
}

const ok = (inDivision: boolean, inMarketing = false): DepartmentCheck => ({
  state: "ok",
  inDivision,
  inMarketing,
});

describe("IdentityService 部门口径", () => {
  it("事业部内未录表用户可访问且看全部", async () => {
    const { service } = makeService(null, ok(true, false));
    await expect(service.resolve("ou_a")).resolves.toMatchObject({
      accessState: "granted",
      canAccess: true,
      isVisitor: true,
      isDivisionMember: true,
      inDivision: true,
      inMarketing: false,
      isUploadRole: false,
    });
  });

  it("市场部未录表用户可上传", async () => {
    const { service } = makeService(null, ok(true, true));
    await expect(service.resolve("ou_a")).resolves.toMatchObject({
      accessState: "granted",
      inMarketing: true,
      isUploadRole: true,
    });
  });

  it("事业部外未录表用户被拒", async () => {
    const { service } = makeService(null, ok(false));
    await expect(service.resolve("ou_a")).resolves.toMatchObject({
      accessState: "denied",
      canAccess: false,
      isUploadRole: false,
    });
  });

  it("事业部外但在人员表的销售可访问", async () => {
    const { service } = makeService("区域销售", ok(false));
    await expect(service.resolve("ou_a")).resolves.toMatchObject({
      accessState: "granted",
      isVisitor: false,
      isDivisionMember: false,
      isUploadRole: false,
    });
  });

  it("人员表设计师不在市场部也能上传", async () => {
    const { service } = makeService("设计师", ok(true, false));
    await expect(service.resolve("ou_a")).resolves.toMatchObject({ isUploadRole: true });
  });

  it("部门未配置时退回人员表口径", async () => {
    const { service } = makeService(null, { state: "unconfigured" });
    await expect(service.resolve("ou_a")).resolves.toMatchObject({
      accessState: "granted",
      isVisitor: true,
      isDivisionMember: false,
      inDivision: false,
      isUploadRole: false,
    });
  });

  it("部门验证失败时人员表用户放行且不缓存身份", async () => {
    const failed: DepartmentCheck = { state: "failed", reason: "no permission" };
    const tabled = makeService("设计师", failed);
    await expect(tabled.service.resolve("ou_a")).resolves.toMatchObject({
      accessState: "granted",
      isUploadRole: true,
    });
    await tabled.service.resolve("ou_a");
    expect(tabled.departments.check).toHaveBeenCalledTimes(2);

    const untabled = makeService(null, failed);
    await expect(untabled.service.resolve("ou_a")).resolves.toMatchObject({
      accessState: "unverified",
      canAccess: false,
    });
    await untabled.service.resolve("ou_a");
    expect(untabled.departments.check).toHaveBeenCalledTimes(2);
  });

  it("成功结果缓存 10 分钟", async () => {
    const { service, departments } = makeService(null, ok(true));
    await service.resolve("ou_a");
    await service.resolve("ou_a");
    expect(departments.check).toHaveBeenCalledTimes(1);
  });
});
