import React from "react";
import { Link } from "react-router-dom";
import {
  Box,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  Clock3,
  FileText,
  Hourglass,
  Image as ImageIcon,
  Lock,
  Package,
  Send,
  Star,
  type LucideIcon,
} from "lucide-react";

import {
  EXTERNAL_LABELS,
  STATUS_LABELS,
  translateMaterialStatus,
  type MaterialStatusLabel,
} from "@shared/status";
import FallbackImage from "@client/src/components/FallbackImage";
import type { Language } from "@client/src/i18n/dictionary";
import { preloadPage } from "@client/src/lib/page-loaders";
import { cn } from "@/lib/utils";
import { prefetchMaterialDetail } from "./library-queries";

export interface MaterialCardProps {
  baseRecordId: string;
  materialName: string;
  materialType: string;
  previewUrl: string | null;
  language: Language;
  standardName?: string;
  currentVersion?: string;
  coverUrl?: string | null;
  releaseStatus?: string;
  versionStatus?: string;
  allowExternalSend?: boolean;
  /** 480px 缩略图，优先使用；失败再依次尝试原图、封面、后端兜底 */
  thumbUrl?: string | null;
  productModel?: string | null;
  appLanguage?: string;
  isRecommended?: boolean;
  /** 首屏卡片：立即加载并提高下载优先级 */
  priority?: boolean;
}

interface TypeVisual {
  gradient: string;
  Icon: LucideIcon;
}

interface TypeVisualRule {
  match: RegExp;
  visual: TypeVisual;
}

/** 封面缺失时的占位视觉：主色相低饱和渐变 + 类型线性图标，绝不出现破图 */
const TYPE_VISUAL_RULES: TypeVisualRule[] = [
  {
    match: /视频|video/ui,
    visual: {
      gradient: "linear-gradient(135deg, hsl(215 45% 93%), hsl(215 38% 85%))",
      Icon: Clapperboard,
    },
  },
  {
    match: /海报|平面|poster|kv/ui,
    visual: {
      gradient: "linear-gradient(135deg, hsl(205 45% 93%), hsl(215 38% 86%))",
      Icon: ImageIcon,
    },
  },
  {
    match: /手册|文档|指南|guide|brochure/ui,
    visual: {
      gradient: "linear-gradient(135deg, hsl(228 42% 94%), hsl(218 38% 87%))",
      Icon: FileText,
    },
  },
  {
    match: /模型|渲染|3d/ui,
    visual: {
      gradient: "linear-gradient(135deg, hsl(195 42% 93%), hsl(210 38% 86%))",
      Icon: Box,
    },
  },
];

const DEFAULT_TYPE_VISUAL: TypeVisual = {
  gradient: "linear-gradient(135deg, hsl(215 45% 94%), hsl(215 40% 86%))",
  Icon: Package,
};

function getTypeVisual(materialType: string): TypeVisual {
  const rule: TypeVisualRule | undefined = TYPE_VISUAL_RULES.find(
    (item: TypeVisualRule): boolean => item.match.test(materialType),
  );
  return rule?.visual ?? DEFAULT_TYPE_VISUAL;
}

/** 语义色徽章：绿=可用 灰=处理中 橙=等你 红=已过期（AGENTS.md 2.3） */
const STATUS_BADGE_STYLES: Record<MaterialStatusLabel, string> = {
  ok: "bg-success-soft text-success-text",
  mute: "border-border bg-muted text-muted-foreground",
  warn: "bg-warning-soft text-warning-text",
  bad: "bg-danger-soft text-danger-text",
};

const STATUS_ICONS: Record<MaterialStatusLabel, LucideIcon> = {
  ok: CheckCircle2,
  mute: Clock3,
  warn: Hourglass,
  bad: CircleAlert,
};

const RECOMMENDED_LABEL: Record<Language, string> = {
  zh: "推荐",
  en: "Featured",
};

const MaterialCard: React.FC<MaterialCardProps> = ({
  baseRecordId,
  materialName,
  materialType,
  previewUrl,
  language,
  standardName = "",
  currentVersion = "",
  coverUrl = null,
  releaseStatus,
  versionStatus,
  allowExternalSend,
  thumbUrl = null,
  productModel = null,
  appLanguage = "",
  isRecommended = false,
  priority = false,
}: MaterialCardProps) => {
  // 封面降级链：缩略图 → 原预览图 → 封面图 → 后端兜底缩略图 → 类型占位（绝不出现破图）
  // 预览图与封面都没有时直接显示类型占位，不发无谓请求
  const hasAnyImage: boolean = Boolean(thumbUrl || previewUrl || coverUrl);
  const imageSources: Array<string | null> = hasAnyImage
    ? [thumbUrl, previewUrl, coverUrl, `/api/materials/${baseRecordId}/thumbnail`]
    : [];

  const handleIntent = (): void => {
    preloadPage("material");
    prefetchMaterialDetail(baseRecordId);
  };

  const visual: TypeVisual = getTypeVisual(materialType);
  // 英文态：standardName 升为主标题，materialName 降为副标题
  const primaryIsStandard: boolean = language === "en" && standardName !== "";
  const primaryTitle: string = primaryIsStandard ? standardName : materialName;
  const secondaryTitle: string = primaryIsStandard
    ? materialName
    : standardName;

  const showStatusBadge: boolean = releaseStatus !== undefined;
  const showExternalBadge: boolean = allowExternalSend !== undefined;
  const statusLabel: MaterialStatusLabel = translateMaterialStatus(
    releaseStatus ?? null,
    versionStatus ?? null,
  );
  const StatusIcon: LucideIcon = STATUS_ICONS[statusLabel];
  const externalReady: boolean = allowExternalSend === true;
  const metaParts: string[] = [productModel ?? "", appLanguage].filter(
    (value: string): boolean => value.trim() !== "",
  );

  return (
    <Link
      to={`/material/${baseRecordId}`}
      onPointerEnter={handleIntent}
      onFocus={handleIntent}
      onTouchStart={handleIntent}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:translate-y-0 active:shadow-sm"
    >
      <div className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden bg-surface-sunken p-3.5">
        <FallbackImage
          sources={imageSources}
          alt={materialName}
          priority={priority}
          skeletonClassName="inset-3.5"
          className="relative max-h-full max-w-full rounded-md object-contain shadow-[0_0_0_1px_rgba(16_24_40_0.07)] transition-[opacity,transform] group-hover:scale-[1.04]"
          placeholder={
            <div
              className="flex h-full w-full items-center justify-center rounded-md"
              style={{ background: visual.gradient }}
            >
              <visual.Icon className="size-5 text-accent-foreground" />
            </div>
          }
        />
        {materialType !== "" ? (
          <span className="absolute left-2.5 top-2.5 rounded-md border border-black/[0.07] bg-white/[0.86] px-1.5 py-0.5 text-xs font-medium text-foreground backdrop-blur-md">
            {materialType}
          </span>
        ) : null}
        {currentVersion !== "" ? (
          <span className="absolute right-2.5 top-2.5 rounded-md border border-black/[0.07] bg-white/[0.86] px-1.5 py-0.5 font-mono text-xs font-medium text-foreground backdrop-blur-md">
            {currentVersion}
          </span>
        ) : null}
        {isRecommended ? (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
            <Star className="size-3" />
            {RECOMMENDED_LABEL[language]}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="min-w-0">
          <h3
            className="line-clamp-2 min-h-[42px] text-[15px] font-semibold leading-[1.42] text-foreground transition-colors duration-150 group-hover:text-primary"
            title={primaryTitle}
          >
            {primaryTitle}
          </h3>
          {secondaryTitle !== "" ? (
            <p
              className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
              title={secondaryTitle}
            >
              {secondaryTitle}
            </p>
          ) : null}
        </div>

        {showStatusBadge || showExternalBadge || metaParts.length > 0 ? (
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {showStatusBadge ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                  STATUS_BADGE_STYLES[statusLabel],
                )}
              >
                <StatusIcon className="size-3" />
                {STATUS_LABELS[statusLabel][language]}
              </span>
            ) : null}
            {showExternalBadge && externalReady ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Send className="size-3" />
                {EXTERNAL_LABELS.client[language]}
              </span>
            ) : null}
            {metaParts.length > 0 ? (
              <span className="ml-auto truncate font-mono text-xs text-foreground-subtle">
                {metaParts.join(" · ")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
};

export default MaterialCard;
