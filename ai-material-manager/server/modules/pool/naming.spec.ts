import { buildNamingPreview, parseGuidedNamingInput } from "@shared/naming";

describe("guided naming preview", () => {
  it("builds the current product naming structure", () => {
    const input = parseGuidedNamingInput({
      category: "product",
      productModel: "IPV-1K612U",
      materialType: "Datasheet 数据表",
      language: "EN",
      region: "PK",
      version: "1.0",
    });
    expect(input).not.toBeNull();
    expect(buildNamingPreview(input!)).toEqual({
      preview: "IPV-1K612U-Datasheet-En-(PK)-V1.0",
      missing: [],
      complete: true,
    });
  });

  it("omits language for exhibition naming", () => {
    const input = parseGuidedNamingInput({
      category: "expo",
      materialType: "Poster 海报",
      language: "EN",
      region: "PK",
      version: "V1.0",
      brandOrExpoName: "GITEX",
      eventYear: "2026",
    });
    expect(buildNamingPreview(input!).preview).toBe(
      "(2026)GITEX-Poster-(PK)-V1.0",
    );
  });
});
