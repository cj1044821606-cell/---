import dayjs from "dayjs";

import type { MaterialDetail, MaterialEditFields } from "@shared/material";

/** 按物料类型着色的封面占位渐变（与原型 TYPE_ART 对齐）。 */
export interface MaterialTypeArt {
  from: string;
  to: string;
}

export const MATERIAL_TYPE_ART: Record<string, MaterialTypeArt> = {
  "VI 品牌视觉": { from: "#4c4f9e", to: "#7b6fd0" },
  "Datasheet 数据表": { from: "#2f5f9e", to: "#5b8fd4" },
  "KV 主视觉": { from: "#7d3f8c", to: "#b06bc0" },
  "Poster 海报": { from: "#b5651d", to: "#e0964b" },
  "Folder 折页": { from: "#1f7a6e", to: "#4aada0" },
  "Flyer 单页": { from: "#a83b52", to: "#d4738a" },
  "Brochure 画册": { from: "#2a6b52", to: "#57a37f" },
  "ProductVideo 产品视频": { from: "#3a4250", to: "#6b7684" },
  "DetailPage 详情页·长图": { from: "#2d7048", to: "#5ca878" },
  "IDImage ID白底图": { from: "#5a6472", to: "#98a1ad" },
};

const FALLBACK_TYPE_ART: MaterialTypeArt = { from: "#3a69a8", to: "#7396c6" };

export function getTypeArt(materialType: string): MaterialTypeArt {
  return MATERIAL_TYPE_ART[materialType] ?? FALLBACK_TYPE_ART;
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : value;
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm") : value;
}

/** 编辑草稿（六个白名单字段）。 */
export interface EditDraft {
  materialName: string;
  isRecommended: boolean;
  validityPeriod: number | null;
  riskLabel: string[];
  appLanguage: string;
  applicableRegion: string[];
}

export function createDraftFromMaterial(material: MaterialDetail): EditDraft {
  return {
    materialName: material.materialName,
    isRecommended: material.isRecommended,
    validityPeriod: null,
    riskLabel: [...material.riskLabel],
    appLanguage: material.appLanguage,
    applicableRegion: [...material.applicableRegion],
  };
}

function sortedJoin(values: string[]): string {
  return [...values].sort().join("|");
}

/** 对比草稿与线上值，返回脏字段（接口字段 key）。 */
export function diffDraft(
  draft: EditDraft,
  material: MaterialDetail,
): Array<keyof MaterialEditFields> {
  const dirty: Array<keyof MaterialEditFields> = [];
  if (draft.materialName.trim() !== material.materialName) {
    dirty.push("material_name");
  }
  if (draft.isRecommended !== material.isRecommended) {
    dirty.push("is_recommended");
  }
  if (draft.validityPeriod !== null) {
    dirty.push("validity_period");
  }
  if (sortedJoin(draft.riskLabel) !== sortedJoin(material.riskLabel)) {
    dirty.push("risk_label");
  }
  if (draft.appLanguage !== material.appLanguage) {
    dirty.push("app_language");
  }
  if (
    sortedJoin(draft.applicableRegion) !== sortedJoin(material.applicableRegion)
  ) {
    dirty.push("applicable_region");
  }
  return dirty;
}

/** 只取脏字段构造一次 PATCH 载荷。 */
export function buildEditFields(
  draft: EditDraft,
  dirty: Array<keyof MaterialEditFields>,
): MaterialEditFields {
  const fields: MaterialEditFields = {};
  for (const key of dirty) {
    if (key === "material_name") {
      fields.material_name = draft.materialName.trim();
    } else if (key === "is_recommended") {
      fields.is_recommended = draft.isRecommended;
    } else if (key === "validity_period" && draft.validityPeriod !== null) {
      fields.validity_period = draft.validityPeriod;
    } else if (key === "risk_label") {
      fields.risk_label = [...draft.riskLabel];
    } else if (key === "app_language") {
      fields.app_language = draft.appLanguage;
    } else if (key === "applicable_region") {
      fields.applicable_region = [...draft.applicableRegion];
    }
  }
  return fields;
}

export function toggleListValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item: string) => item !== value)
    : [...list, value];
}

export const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "sw", label: "Kiswahili" },
  { value: "am", label: "Amharic" },
  { value: "ar", label: "Arabic" },
];

export const REGION_PRESETS: string[] = [
  "全球",
  "非洲",
  "南亚",
  "东南亚",
  "中东",
  "欧洲",
  "拉美",
];

export const RISK_PRESETS: string[] = [
  "内容敏感",
  "版权风险",
  "合规风险",
  "时效性风险",
];

export const PROBLEM_TYPE_VALUES: string[] = [
  "内容错误",
  "文件损坏",
  "版本错误",
  "其他",
];

export const SEVERITY_VALUES: string[] = ["一般", "重要", "紧急"];

export const PROBLEM_TYPE_LABEL_KEYS: Record<string, string> = {
  内容错误: "feedback.type.content",
  文件损坏: "feedback.type.corrupt",
  版本错误: "feedback.type.version",
  其他: "feedback.type.other",
};

export const SEVERITY_LABEL_KEYS: Record<string, string> = {
  一般: "feedback.sev.normal",
  重要: "feedback.sev.important",
  紧急: "feedback.sev.urgent",
};

/** appliedFields 回显时的字段名映射。 */
export const EDIT_FIELD_LABEL_KEYS: Record<keyof MaterialEditFields, string> = {
  material_name: "edit.field.materialName",
  is_recommended: "edit.field.isRecommended",
  validity_period: "edit.field.validityPeriod",
  risk_label: "edit.field.riskLabel",
  app_language: "edit.field.appLanguage",
  applicable_region: "edit.field.applicableRegion",
};
