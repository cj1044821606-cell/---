import type { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import type { IdentityService } from "@server/modules/identity/identity.service";
import type { GuidedNamingInput } from "@shared/naming";
import {
  PrereleaseService,
  suggestNextVersions,
  uniqueStandardName,
  type PrereleasePublishInput,
} from "./prerelease.service";

type Fields = Record<string, unknown>;

/** 内存版多维表格：写入用中文字段名，读取时映射成与真实网关一致的英文属性 */
class FakeBase {
  tables: Record<string, Map<string, Fields>> = {
    main: new Map(),
    version: new Map(),
    release: new Map(),
  };
  writes: string[] = [];
  failOn: string | null = null;
  private seq = 0;

  userField = (ids: string[]): Array<{ id: string }> => ids.map((id) => ({ id }));

  async createRecord(table: string, fields: Fields): Promise<string> {
    this.writes.push(`create:${table}`);
    if (this.failOn === `create:${table}`) throw new Error(`boom ${table}`);
    this.seq += 1;
    const id = `rec_${table}_${this.seq}`;
    const stored: Fields = { ...fields };
    if (table === "main") stored["内部物料ID"] = `MAT-${String(this.seq).padStart(4, "0")}`;
    this.tables[table]!.set(id, stored);
    return id;
  }

  async updateRecord(table: string, id: string, fields: Fields): Promise<string> {
    this.writes.push(`update:${table}`);
    if (this.failOn === `update:${table}`) throw new Error(`boom ${table}`);
    const row = this.tables[table]!.get(id);
    if (!row) throw new Error(`missing ${id}`);
    Object.assign(row, fields);
    return id;
  }

  async deleteRecord(table: string, id: string): Promise<void> {
    this.writes.push(`delete:${table}`);
    this.tables[table]!.delete(id);
  }

  async rows(table: string): Promise<Fields[]> {
    return [...this.tables[table]!.entries()].map(([id, f]) => this.map(table, id, f));
  }

  async rowById(table: string, id: string): Promise<Fields> {
    const row = this.tables[table]!.get(id);
    if (!row) throw new Error("not found");
    return this.map(table, id, row);
  }

  seedMain(id: string, fields: Fields): void {
    this.tables.main!.set(id, fields);
  }

  seedVersion(id: string, fields: Fields): void {
    this.tables.version!.set(id, fields);
  }

  private map(table: string, id: string, f: Fields): Fields {
    if (table === "main") {
      const planner = f["策划及审核人"] as Array<{ id: string }> | undefined;
      return {
        baseRecordId: id,
        standardName: f["标准命名"] ?? null,
        currentVersion: f["当前版本"] ?? null,
        releaseStatus: f["发布状态"] ?? null,
        plannerApprover: planner?.[0]?.id ?? null,
        appMaterialId: f["物料ID"] ?? null,
        appInternalMaterialId: f["内部物料ID"] ?? null,
        isPrerelease: f["预发布"] === true,
      };
    }
    return {
      baseRecordId: id,
      relatedMaterial: { link_record_ids: (f["关联物料"] as string[]) ?? [] },
      isCurrentValid: f["是否当前有效"] === true,
      auditStatus: f["审核状态"] ?? null,
    };
  }
}

const naming: GuidedNamingInput = {
  category: "product",
  productModel: "IPV-1K612U",
  materialType: "Datasheet 数据表",
  language: "EN",
  region: "PK",
  version: "V1.0",
};

function input(overrides: Partial<PrereleasePublishInput> = {}): PrereleasePublishInput {
  return {
    naming,
    materialName: "IPV-1K612U 数据表·巴基斯坦",
    productLine: "INV 逆变器",
    regions: ["AF 非洲", "ME 中东"],
    allowExternalSend: true,
    plannerAuditorId: "ou_planner",
    exportFiles: [{ fileToken: "tok_m", size: 1000 }],
    sourceFiles: [],
    previewFiles: [],
    ...overrides,
  };
}

describe("naming helpers", () => {
  it("adds -NN only on a real conflict", () => {
    expect(uniqueStandardName("A-V1.0", ["B"])).toEqual({ name: "A-V1.0", conflict: false });
    expect(uniqueStandardName("A-V1.0", ["A-V1.0", "A-V1.0-02"])).toEqual({
      name: "A-V1.0-03",
      conflict: true,
    });
  });

  it("suggests minor and major bumps", () => {
    expect(suggestNextVersions("V1.2")).toEqual({ minor: "V1.3", major: "V2.0" });
    expect(suggestNextVersions("1.0")).toEqual({ minor: "V1.1", major: "V2.0" });
    expect(suggestNextVersions("draft")).toEqual({ minor: null, major: null });
  });
});

describe("PrereleaseService", () => {
  let base: FakeBase;
  let isMaintainer: boolean;
  let service: PrereleaseService;

  beforeEach(() => {
    base = new FakeBase();
    isMaintainer = false;
    const identity = {
      resolve: jest.fn(async () => ({ isMaintainer })),
    } as unknown as IdentityService;
    service = new PrereleaseService(base as unknown as FeishuBaseGateway, identity);
  });

  it("publishes a new material as pre-release in the safe order", async () => {
    const result = await service.publish("ou_uploader", input());

    expect(result.standardName).toBe("IPV-1K612U-Datasheet-En-(PK)-V1.0");
    // 主表先建为待发布，版本/发布记录都连好后才置已发布
    expect(base.writes).toEqual([
      "create:main",
      "update:main",
      "create:version",
      "create:release",
      "update:main",
    ]);
    const main = base.tables.main!.get(result.materialId)!;
    expect(main).toMatchObject({
      标准命名: "IPV-1K612U-Datasheet-En-(PK)-V1.0",
      发布状态: "已发布",
      预发布: true,
      物料ID: main["内部物料ID"],
      适用区域: ["AF 非洲", "ME 中东"],
      语言: "EN",
      产品或品牌物料: "产品物料",
      策划及审核人: [{ id: "ou_planner" }],
      订阅者: [{ id: "ou_uploader" }],
      当前有效附件: [{ file_token: "tok_m" }],
    });
    expect(main["替代的旧版本"]).toBeUndefined();
    expect(base.tables.version!.get(result.versionRecordId)).toMatchObject({
      版本类型: "首版",
      审核状态: "待审核",
      是否当前有效: true,
      修改人: [{ id: "ou_uploader" }],
      关联物料: [result.materialId],
    });
    expect(base.tables.release!.get(result.releaseRecordId)).toMatchObject({
      发布区域: ["AF 非洲", "ME 中东"],
      关联物料: [result.materialId],
      发布版本: [result.versionRecordId],
      是否通知旧版废弃: false,
    });
  });

  it("replaces an old version: inherits 物料ID, links it for takedown, retires the old version record", async () => {
    base.seedMain("rec_old", {
      标准命名: "IPV-1K612U-Datasheet-En-(PK)-V1.0",
      当前版本: "V1.0",
      发布状态: "已发布",
      物料ID: "MAT-0007",
    });
    base.seedVersion("rec_old_v", { 关联物料: ["rec_old"], 是否当前有效: true });

    const result = await service.publish(
      "ou_uploader",
      input({
        naming: { ...naming, version: "V1.1" },
        replaceMaterialId: "rec_old",
        versionType: "小改",
        changeSummary: "更新了第二页的参数表",
      }),
    );

    const main = base.tables.main!.get(result.materialId)!;
    expect(main).toMatchObject({ 物料ID: "MAT-0007", 替代的旧版本: ["rec_old"] });
    // 继承旧版物料ID，不需要再回写自动编号
    expect(base.writes).toEqual([
      "create:main",
      "create:version",
      "create:release",
      "update:main",
      "update:version",
    ]);
    expect(base.tables.version!.get(result.versionRecordId)).toMatchObject({
      版本类型: "小改",
      对比旧版本: ["rec_old_v"],
      AI对比摘要: "更新了第二页的参数表",
    });
    expect(base.tables.version!.get("rec_old_v")).toMatchObject({ 是否当前有效: false });
    expect(base.tables.release!.get(result.releaseRecordId)).toMatchObject({
      是否通知旧版废弃: true,
      旧版本处理方式: "已替代",
    });
  });

  it("refuses to replace with the same version number", async () => {
    base.seedMain("rec_old", { 当前版本: "V1.0", 发布状态: "已发布" });
    await expect(
      service.publish("ou_uploader", input({ replaceMaterialId: "rec_old" })),
    ).rejects.toThrow(/升级版本号/u);
    expect(base.writes).toEqual([]);
  });

  it("de-duplicates the standard name against existing materials", async () => {
    base.seedMain("rec_x", { 标准命名: "IPV-1K612U-Datasheet-En-(PK)-V1.0" });
    const result = await service.publish("ou_uploader", input());
    expect(result.standardName).toBe("IPV-1K612U-Datasheet-En-(PK)-V1.0-02");
  });

  it("rolls back records created before a failure", async () => {
    base.failOn = "create:release";
    await expect(service.publish("ou_uploader", input())).rejects.toThrow(/boom/u);
    expect(base.tables.main!.size).toBe(0);
    expect(base.tables.version!.size).toBe(0);
    expect(base.writes.slice(-2)).toEqual(["delete:version", "delete:main"]);
  });

  it("rejects incomplete naming before writing anything", async () => {
    await expect(
      service.publish("ou_uploader", input({ naming: { ...naming, productModel: "" } })),
    ).rejects.toThrow(/productModel/u);
    expect(base.writes).toEqual([]);
  });

  describe("review", () => {
    let materialId: string;

    beforeEach(async () => {
      materialId = (await service.publish("ou_uploader", input())).materialId;
      base.writes = [];
    });

    it("lets the assigned planner approve: clears the flag and passes the version", async () => {
      await expect(service.approve("ou_planner", materialId)).resolves.toMatchObject({
        result: "approved",
      });
      expect(base.tables.main!.get(materialId)).toMatchObject({ 预发布: false });
      const version = [...base.tables.version!.values()][0]!;
      expect(version).toMatchObject({ 审核状态: "通过", 是否当前有效: true });
    });

    it("forbids other users unless they are maintainers", async () => {
      await expect(service.approve("ou_someone", materialId)).rejects.toThrow(
        /策划人及审核人/u,
      );
      isMaintainer = true;
      await expect(service.approve("ou_someone", materialId)).resolves.toBeTruthy();
    });

    it("rejects with a reason: takes it offline and keeps the reason", async () => {
      await expect(service.reject("ou_planner", materialId, "  ")).rejects.toThrow(
        /原因/u,
      );
      await service.reject("ou_planner", materialId, "型号写错了");
      expect(base.tables.main!.get(materialId)).toMatchObject({
        发布状态: "已下架",
        审核意见: "型号写错了",
        预发布: true,
      });
      const version = [...base.tables.version!.values()][0]!;
      expect(version).toMatchObject({ 审核状态: "退回", 是否当前有效: false });
      // 已处理过的预发布不能再审核
      await expect(service.approve("ou_planner", materialId)).rejects.toThrow(
        /预发布/u,
      );
    });
  });
});
