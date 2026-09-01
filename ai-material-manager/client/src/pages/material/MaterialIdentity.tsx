import React, { useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Globe,
  Hourglass,
  Lock,
  Star,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type {
  MaterialDetail,
  MaterialEditFields,
} from "@shared/material";
import {
  EXTERNAL_LABELS,
  STATUS_LABELS,
  translateMaterialStatus,
  type MaterialStatusLabel,
} from "@shared/status";
import { Badge } from "@client/src/components/ui/badge";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";
import { type EditDraft } from "./material-detail-utils";
import MaterialEditPanel from "./MaterialEditPanel";

const STATUS_BADGE_CLASSES: Record<MaterialStatusLabel, string> = {
  ok: "bg-success-soft text-success-text rounded-md font-medium",
  mute: "bg-surface-sunken text-muted-foreground rounded-md font-medium",
  warn: "bg-warning-soft text-warning-text rounded-md font-medium",
  bad: "bg-danger-soft text-danger-text rounded-md font-medium",
};

const STATUS_ICONS: Record<MaterialStatusLabel, LucideIcon> = {
  ok: CheckCircle2,
  mute: Clock3,
  warn: Hourglass,
  bad: XCircle,
};

interface MaterialIdentityProps {
  material: MaterialDetail;
  editing: boolean;
  draft: EditDraft | null;
  dirtyKeys: Array<keyof MaterialEditFields>;
  onDraftChange: (patch: Partial<EditDraft>) => void;
}

const MaterialIdentity: React.FC<MaterialIdentityProps> = ({
  material,
  editing,
  draft,
  dirtyKeys,
  onDraftChange,
}) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);

  const statusLabel: MaterialStatusLabel = translateMaterialStatus(
    material.releaseStatus,
    material.versionStatus,
  );
  const StatusIcon: LucideIcon = STATUS_ICONS[statusLabel];
  const enFirst: boolean = language === "en";
  const mainTitle: string = enFirst
    ? material.standardName
    : material.materialName;
  const subTitle: string = enFirst
    ? material.materialName
    : material.standardName;

  const kvItems: Array<{ key: string; label: string; value: React.ReactNode }> =
    [
      {
        key: "model",
        label: pt("identity.kv.model"),
        value: material.productModel ?? "—",
      },
      {
        key: "type",
        label: pt("identity.kv.type"),
        value: material.materialType,
      },
      {
        key: "language",
        label: pt("identity.kv.language"),
        value: material.appLanguage,
      },
      {
        key: "region",
        label: pt("identity.kv.region"),
        value: material.applicableRegion.join(", ") || "—",
      },
      {
        key: "currentVersion",
        label: pt("identity.kv.currentVersion"),
        value: (
          <span className="font-mono text-xs">{material.currentVersion}</span>
        ),
      },
      {
        key: "innerNo",
        label: pt("identity.kv.innerNo"),
        value: <span className="font-mono text-xs">{material.appMaterialId}</span>,
      },
    ];

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-sm">
      {editing && draft ? (
        <MaterialEditPanel
          material={material}
          draft={draft}
          dirtyKeys={dirtyKeys}
          onDraftChange={onDraftChange}
        />
      ) : (
        <>
          <h2 className="text-2xl font-semibold tracking-tight leading-snug text-foreground">
            {mainTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{subTitle}</p>
          {enFirst ? null : (
            <p className="mt-2 inline-flex items-center gap-1 rounded bg-surface-sunken px-2 py-1 font-mono text-xs text-muted-foreground">
              {material.standardName}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge className={STATUS_BADGE_CLASSES[statusLabel]}>
              <StatusIcon size={12} />
              {STATUS_LABELS[statusLabel][language]}
            </Badge>
            {material.allowExternalSend ? (
              <Badge className="bg-info-soft text-info-text rounded-md font-medium">
                <Globe size={12} />
                {EXTERNAL_LABELS.client[language]}
              </Badge>
            ) : null}
            {material.isRecommended ? (
              <Badge className="bg-warning-soft text-warning-text rounded-md font-medium">
                <Star size={12} />
                {pt("identity.recommended")}
              </Badge>
            ) : null}
            {material.riskLabel.map((risk: string) => (
              <Badge
                key={risk}
                className="border-danger-soft bg-danger-soft text-danger-text rounded-md font-medium"
                variant="outline"
              >
                {risk}
              </Badge>
            ))}
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-dashed border-border pt-4 sm:grid-cols-2">
            {kvItems.map(
              (item: {
                key: string;
                label: string;
                value: React.ReactNode;
              }) => (
                <div key={item.key}>
                  <dt className="text-xs text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {item.value}
                  </dd>
                </div>
              ),
            )}
          </dl>

          {editing ? null : (
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground/80">
              <Lock size={12} className="opacity-60" />
              {pt("edit.note")}
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default MaterialIdentity;
