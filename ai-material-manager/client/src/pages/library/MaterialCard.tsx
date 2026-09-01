import React, { useEffect, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";

import {
  EXTERNAL_LABELS,
  STATUS_LABELS,
  translateMaterialStatus,
  type MaterialStatusLabel,
} from "@shared/status";
import { Image } from "@client/src/components/ui/image";
import type { Language } from "@client/src/i18n/dictionary";
import { cn } from "@/lib/utils";

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
}: MaterialCardProps) => {
  // 封面降级链：previewUrl → coverUrl → thumbnail API → 类型占位
  const [imgSrc, setImgSrc] = useState<string | null>(
    previewUrl ?? coverUrl ?? null,
  );
  const [triedThumbnail, setTriedThumbnail] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(previewUrl ?? coverUrl ?? null);
    setTriedThumbnail(false);
  }, [previewUrl, coverUrl, baseRecordId]);

  const handleImageError = (): void => {
    if (imgSrc === previewUrl && coverUrl) {
      setImgSrc(coverUrl);
    } else if (!triedThumbnail && baseRecordId) {
      setImgSrc(`/api/materials/${baseRecordId}/thumbnail`);
      setTriedThumbnail(true);
    } else {
      setImgSrc(null);
    }
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

  return (
    <Link
      to={`/material/${baseRecordId}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden bg-surface-sunken p-3.5">
        {imgSrc !== null ? (
          <Image
            src={imgSrc}
            alt={materialName}
            loading="lazy"
            onError={handleImageError}
            className="max-h-full max-w-full rounded-md object-contain shadow-[0_0_0_1px_rgba(16_24_40_0.07)] transition-transform duration-150 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: visual.gradient }}
          >
            <visual.Icon className="size-5 text-accent-foreground" />
          </div>
        )}
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
      </div>

      <div className="p-3.5">
        <div className="min-w-0">
          <h3
            className="line-clamp-2 min-h-[42px] text-[15px] font-semibold leading-[1.42] text-foreground"
          >
            {primaryTitle}
          </h3>
          {secondaryTitle !== "" ? (
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {secondaryTitle}
            </p>
          ) : null}
        </div>

        {showStatusBadge || showExternalBadge ? (
          <div className="flex flex-wrap items-center gap-1.5">
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
          </div>
        ) : null}
      </div>
    </Link>
  );
};

export default MaterialCard;
