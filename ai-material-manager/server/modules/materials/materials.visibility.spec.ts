import { MaterialsService } from "./materials.service";

function visible(identity: Record<string, unknown>, material: Record<string, unknown>): boolean {
  const service = new MaterialsService({} as any, {} as any, {} as any, {} as any, {} as any);
  return (service as any).isMaterialVisible(material, identity);
}

const regionalMaterial = {
  releaseStatus: "已发布",
  applicableRegion: ["AF 非洲"],
  allowExternalSend: false,
};

describe("物料可见性 · 事业部口径", () => {
  it("事业部成员看到非全球非外发物料", () => {
    expect(
      visible({ isVisitor: true, isDivisionMember: true, area: null }, regionalMaterial),
    ).toBe(true);
  });

  it("传统访客仍只看全球可外发", () => {
    expect(
      visible({ isVisitor: true, isDivisionMember: false, area: null }, regionalMaterial),
    ).toBe(false);
  });

  it("事业部成员也看不到未发布物料", () => {
    expect(
      visible(
        { isVisitor: true, isDivisionMember: true, area: null },
        { ...regionalMaterial, releaseStatus: "已下架" },
      ),
    ).toBe(false);
  });
});
