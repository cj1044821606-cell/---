export type MaterialStatusLabel = "ok" | "mute" | "warn" | "bad";

export const STATUS_LABELS: Record<
  MaterialStatusLabel,
  { zh: string; en: string }
> = {
  ok: { zh: "可用", en: "Ready" },
  mute: { zh: "处理中", en: "In progress" },
  warn: { zh: "等你", en: "Waiting on you" },
  bad: { zh: "已过期", en: "Outdated" },
};

export const EXTERNAL_LABELS: Record<"client" | "internal", { zh: string; en: string }> = {
  client: { zh: "可发客户", en: "Client OK" },
  internal: { zh: "仅内部", en: "Internal" },
};

export function translateMaterialStatus(
  releaseStatus: string | null,
  versionStatus: string | null,
): MaterialStatusLabel {
  if (
    releaseStatus === "已下架" ||
    versionStatus === "已替代" ||
    versionStatus === "已废弃"
  ) {
    return "bad";
  }
  if (releaseStatus === "已发布" && versionStatus === "正式版") {
    return "ok";
  }
  return "mute";
}

export function isExternalShareReady(
  allowExternalSend: boolean,
  label: MaterialStatusLabel,
): boolean {
  return allowExternalSend && label === "ok";
}
