import { z } from "zod";

export const MATERIAL_TYPE_OPTIONS = [
  "Folder 折页",
  "Flyer 单页",
  "Datasheet 数据表",
  "DetailPage 详情页/长图",
  "KV 主视觉",
  "Manual 说明书",
  "USP 卖点文档",
  "ProductVideo 产品视频",
  "InstallVideo 安装视频",
  "Photo 产品图/场景图",
  "IDImage ID白底图",
  "Packaging 包装设计",
  "Social 社媒/一图读懂",
  "Brochure 画册",
  "Logo 品牌Logo",
  "VI 品牌视觉",
  "Poster 海报",
  "PPT 演示",
  "Training 培训",
] as const;

export const NAMING_LANGUAGE_OPTIONS = [
  "EN",
  "CN",
  "FR",
  "AR",
  "ES",
  "全语言通用",
] as const;

export type NamingMode = "ai" | "guided";
export type NamingCategory = "product" | "brand" | "expo";

export interface GuidedNamingInput {
  category: NamingCategory;
  productModel?: string;
  materialType?: (typeof MATERIAL_TYPE_OPTIONS)[number];
  language?: (typeof NAMING_LANGUAGE_OPTIONS)[number];
  region?: string;
  version?: string;
  brandOrExpoName?: string;
  eventYear?: string;
}

export interface NamingPreviewResult {
  preview: string;
  missing: string[];
  complete: boolean;
}

const guidedNamingSchema = z.object({
  category: z.enum(["product", "brand", "expo"]),
  productModel: z.string().trim().max(80).optional(),
  materialType: z.enum(MATERIAL_TYPE_OPTIONS).optional(),
  language: z.enum(NAMING_LANGUAGE_OPTIONS).optional(),
  region: z.string().trim().max(20).optional(),
  version: z.string().trim().max(20).optional(),
  brandOrExpoName: z.string().trim().max(80).optional(),
  eventYear: z.string().trim().max(4).optional(),
});

const LANGUAGE_TOKEN: Record<(typeof NAMING_LANGUAGE_OPTIONS)[number], string> =
  {
    EN: "En",
    CN: "Cn",
    FR: "Fr",
    AR: "Ar",
    ES: "Es",
    全语言通用: "",
  };

export function parseGuidedNamingInput(
  value: unknown,
): GuidedNamingInput | null {
  const parsed = guidedNamingSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function valueOrPlaceholder(
  value: string | undefined,
  placeholder: string,
): string {
  return value?.trim() || `[${placeholder}]`;
}

function materialTypeToken(value: GuidedNamingInput["materialType"]): string {
  return value?.split(/\s+/u)[0] ?? "[物料类型]";
}

function versionToken(value: string | undefined): string {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (/^V\d+\.\d+$/u.test(normalized)) return normalized;
  if (/^\d+\.\d+$/u.test(normalized)) return `V${normalized}`;
  return "[版本号]";
}

function regionToken(value: string | undefined): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (!normalized || normalized === "GLOBAL" || normalized === "HQ")
    return null;
  return `(${normalized.replace(/[()]/gu, "")})`;
}

export function buildNamingPreview(
  input: GuidedNamingInput,
): NamingPreviewResult {
  const missing: string[] = [];
  const typeToken = materialTypeToken(input.materialType);
  const version = versionToken(input.version);
  const region = regionToken(input.region);
  const language = input.language ? LANGUAGE_TOKEN[input.language] : null;

  if (!input.materialType) missing.push("materialType");
  if (version.startsWith("[")) missing.push("version");

  let segments: string[];
  if (input.category === "product") {
    const model = valueOrPlaceholder(input.productModel, "产品型号");
    if (!input.productModel?.trim()) missing.push("productModel");
    if (!input.language) missing.push("language");
    segments = [model, typeToken];
    if (language) segments.push(language);
    if (region) segments.push(region);
    segments.push(version);
  } else if (input.category === "brand") {
    const isLogo = typeToken === "Logo";
    if (isLogo) {
      const brand = valueOrPlaceholder(input.brandOrExpoName, "品牌名");
      if (!input.brandOrExpoName?.trim()) missing.push("brandOrExpoName");
      segments = [brand, "Logo"];
      if (language) segments.push(language);
    } else {
      if (!input.language) missing.push("language");
      segments = [typeToken];
      if (language) segments.push(language);
    }
    if (region) segments.push(region);
    segments.push(version);
  } else {
    const year = input.eventYear?.trim();
    const expo = valueOrPlaceholder(input.brandOrExpoName, "展会简称");
    if (!/^\d{4}$/u.test(year ?? "")) missing.push("eventYear");
    if (!input.brandOrExpoName?.trim()) missing.push("brandOrExpoName");
    segments = [`(${year || "年份"})${expo}`, typeToken];
    if (region) segments.push(region);
    segments.push(version);
  }

  return {
    preview: segments.join("-"),
    missing: [...new Set(missing)],
    complete: missing.length === 0,
  };
}
