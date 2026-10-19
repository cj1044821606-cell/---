import { DepartmentService, parseDepartmentIds } from "./department.service";

interface Setup {
  config?: Record<string, string | null>;
  userDepartments?: Record<string, string[]>;
  parents?: Record<string, string[]>;
  userGet?: jest.Mock;
}

function memoryCache() {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
}

function makeService(setup: Setup) {
  const config = setup.config ?? {
    access_department_ids: "od-ess",
    upload_department_ids: "od-mkt",
  };
  const base = {
    rows: jest.fn(async () =>
      Object.entries(config).map(([key, textValue]) => ({
        key,
        textValue,
        enabled: true,
      })),
    ),
  };
  const userGet =
    setup.userGet ??
    jest.fn(async ({ path }: { path: { user_id: string } }) => ({
      code: 0,
      data: { user: { department_ids: setup.userDepartments?.[path.user_id] ?? [] } },
    }));
  const parent = jest.fn(async ({ params }: { params: { department_id: string } }) => ({
    code: 0,
    data: {
      has_more: false,
      items: (setup.parents?.[params.department_id] ?? []).map((id) => ({
        open_department_id: id,
        parent_department_id: "",
      })),
    },
  }));
  const feishu = {
    client: { contact: { v3: { user: { get: userGet }, department: { parent } } } },
  };
  const service = new DepartmentService(base as any, feishu as any, memoryCache() as any);
  return { service, userGet, parent, base };
}

describe("parseDepartmentIds", () => {
  it("配置值容忍空格换行与多余逗号", () => {
    expect(parseDepartmentIds(" od-a，od-b\n,od-a, ")).toEqual(["od-a", "od-b"]);
    expect(parseDepartmentIds(null)).toEqual([]);
    expect(parseDepartmentIds(undefined)).toEqual([]);
  });
});

describe("DepartmentService.check", () => {
  it("多层嵌套命中事业部与市场部", async () => {
    const { service } = makeService({
      userDepartments: { ou_a: ["od-team"] },
      parents: { "od-team": ["od-mkt", "od-ess", "od-root"] },
    });
    await expect(service.check("ou_a")).resolves.toEqual({
      state: "ok",
      inDivision: true,
      inMarketing: true,
    });
  });

  it("一人多部门只要一个命中即为成员", async () => {
    const { service } = makeService({
      userDepartments: { ou_a: ["od-other", "od-team"] },
      parents: { "od-other": ["od-root"], "od-team": ["od-ess", "od-root"] },
    });
    await expect(service.check("ou_a")).resolves.toMatchObject({
      state: "ok",
      inDivision: true,
      inMarketing: false,
    });
  });

  it("事业部内非市场部", async () => {
    const { service } = makeService({
      userDepartments: { ou_a: ["od-sales"] },
      parents: { "od-sales": ["od-ess"] },
    });
    await expect(service.check("ou_a")).resolves.toEqual({
      state: "ok",
      inDivision: true,
      inMarketing: false,
    });
  });

  it("直接挂在配置部门本身也算命中", async () => {
    const { service } = makeService({
      userDepartments: { ou_a: ["od-mkt"] },
      parents: { "od-mkt": ["od-ess"] },
    });
    await expect(service.check("ou_a")).resolves.toMatchObject({
      inDivision: true,
      inMarketing: true,
    });
  });

  it("未配置访问部门返回 unconfigured", async () => {
    const { service, userGet } = makeService({
      config: { access_department_ids: "  ", upload_department_ids: "od-mkt" },
    });
    await expect(service.check("ou_a")).resolves.toEqual({ state: "unconfigured" });
    expect(userGet).not.toHaveBeenCalled();
  });

  it("接口权限不足返回 failed，且不写入 30 分钟的部门链缓存", async () => {
    const userGet = jest.fn(async () => ({ code: 99991672, msg: "no permission" }));
    const { service } = makeService({ userGet });
    await expect(service.check("ou_a")).resolves.toMatchObject({ state: "failed" });
    // 失败只进 60 秒短缓存；部门链缓存为空，恢复后下一次即可重新查询
    expect(await (service as any).cache.get("dept:user:v1:ou_a")).toBeNull();
  });

  it("偶发失败重试一次", async () => {
    const userGet = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce({ code: 0, data: { user: { department_ids: ["od-ess"] } } });
    const { service } = makeService({ userGet });
    await expect(service.check("ou_a")).resolves.toMatchObject({
      state: "ok",
      inDivision: true,
    });
  });

  it("部门链被缓存", async () => {
    const { service, userGet, parent } = makeService({
      userDepartments: { ou_a: ["od-team"] },
      parents: { "od-team": ["od-ess"] },
    });
    await service.check("ou_a");
    await service.check("ou_a");
    expect(userGet).toHaveBeenCalledTimes(1);
    expect(parent).toHaveBeenCalledTimes(1);
  });

  it("上级链分页取完", async () => {
    const { service, base } = makeService({ userDepartments: { ou_a: ["od-team"] } });
    void base;
    const parent = jest
      .fn()
      .mockResolvedValueOnce({
        code: 0,
        data: { has_more: true, page_token: "p2", items: [{ open_department_id: "od-mid" }] },
      })
      .mockResolvedValueOnce({
        code: 0,
        data: { has_more: false, items: [{ open_department_id: "od-ess" }] },
      });
    (service as any).feishu.client.contact.v3.department.parent = parent;
    await expect(service.check("ou_a")).resolves.toMatchObject({ inDivision: true });
    expect(parent.mock.calls[1][0].params.page_token).toBe("p2");
  });
});

describe("DepartmentService 并发与失败短缓存", () => {
  it("同一用户并发查询只请求一次通讯录", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const userGet = jest.fn(async () => {
      await gate;
      return { code: 0, data: { user: { department_ids: ["od-ess"] } } };
    });
    const { service } = makeService({ userGet });
    const pending = Promise.all([service.check("ou_a"), service.check("ou_a"), service.check("ou_a")]);
    release();
    const results = await pending;
    expect(results.every((r) => r.state === "ok" && r.inDivision)).toBe(true);
    expect(userGet).toHaveBeenCalledTimes(1);
  });

  it("失败结果短暂缓存 60 秒，期间不重复打通讯录", async () => {
    const userGet = jest.fn(async () => ({ code: 99991672, msg: "no permission" }));
    const { service } = makeService({ userGet });
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    try {
      await expect(service.check("ou_a")).resolves.toMatchObject({ state: "failed" });
      await expect(service.check("ou_a")).resolves.toMatchObject({ state: "failed" });
      expect(userGet).toHaveBeenCalledTimes(2); // 首次请求 + 1 次重试
      now.mockReturnValue(1_000_000 + 61_000);
      await expect(service.check("ou_a")).resolves.toMatchObject({ state: "failed" });
      expect(userGet).toHaveBeenCalledTimes(4);
    } finally {
      now.mockRestore();
    }
  });
});

describe("DepartmentService.configStatus", () => {
  it("返回解析后的两组部门 ID", async () => {
    const { service } = makeService({
      config: { access_department_ids: "od-ess, od-ess2", upload_department_ids: "od-mkt" },
    });
    await expect(service.configStatus()).resolves.toEqual({
      accessIds: ["od-ess", "od-ess2"],
      uploadIds: ["od-mkt"],
    });
  });
});
