import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { CalendarDays, Info, Lock } from "lucide-react";

import type { MaterialDetail, MaterialEditFields } from "@shared/material";
import { Button } from "@client/src/components/ui/button";
import { Calendar } from "@client/src/components/ui/calendar";
import { Input } from "@client/src/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/src/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import { Switch } from "@client/src/components/ui/switch";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";
import {
  type EditDraft,
  LANGUAGE_OPTIONS,
  REGION_PRESETS,
  RISK_PRESETS,
  toggleListValue,
} from "./material-detail-utils";

interface MaterialEditPanelProps {
  material: MaterialDetail;
  draft: EditDraft;
  dirtyKeys: Array<keyof MaterialEditFields>;
  onDraftChange: (patch: Partial<EditDraft>) => void;
}

interface FieldLabelProps {
  text: string;
  dirty: boolean;
}

const FieldLabel: React.FC<FieldLabelProps> = ({ text, dirty }) => (
  <span className="flex items-center text-xs font-medium text-muted-foreground">
    {text}
    {dirty ? (
      <span
        aria-hidden
        className="ml-1.5 inline-block size-1.5 rounded-full bg-warning"
      />
    ) : null}
  </span>
);

interface ChipToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const ChipToggle: React.FC<ChipToggleProps> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[30px] rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
      active
        ? "border-primary bg-primary-soft font-semibold text-primary"
        : "border-border bg-card text-muted-foreground hover:bg-accent"
    }`}
  >
    {label}
  </button>
);

interface LockedRowProps {
  label: string;
  value: string;
  reason: string;
  mono?: boolean;
}

const LockedRow: React.FC<LockedRowProps> = ({
  label,
  value,
  reason,
  mono = false,
}) => (
  <div className="flex items-start gap-2 rounded-md bg-background px-3 py-2">
    <Lock size={13} className="mt-0.5 shrink-0 text-muted-foreground opacity-60" />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`truncate text-sm font-medium text-foreground ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "—"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground/80">{reason}</p>
    </div>
  </div>
);

const MaterialEditPanel: React.FC<MaterialEditPanelProps> = ({
  material,
  draft,
  dirtyKeys,
  onDraftChange,
}) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);
  const [validityOpen, setValidityOpen] = useState<boolean>(false);

  const isDirty = (key: keyof MaterialEditFields): boolean =>
    dirtyKeys.includes(key);

  const languageOptions: Array<{ value: string; label: string }> =
    LANGUAGE_OPTIONS.some(
      (option: { value: string }) => option.value === draft.appLanguage,
    )
      ? LANGUAGE_OPTIONS
      : [
          { value: draft.appLanguage, label: draft.appLanguage },
          ...LANGUAGE_OPTIONS,
        ];

  const regionOptions: string[] = Array.from(
    new Set([...REGION_PRESETS, ...draft.applicableRegion]),
  );
  const riskOptions: string[] = Array.from(
    new Set([...RISK_PRESETS, ...draft.riskLabel]),
  );

  const validityDate: Date | undefined =
    draft.validityPeriod !== null ? new Date(draft.validityPeriod) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-xs leading-relaxed text-info-text">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>{pt("edit.note")}</span>
      </div>

      <div className="space-y-1.5">
        <FieldLabel text={pt("edit.fieldTitle")} dirty={isDirty("material_name")} />
        <Input
          value={draft.materialName}
          maxLength={100}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onDraftChange({ materialName: event.target.value })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <FieldLabel
          text={pt("edit.recommended")}
          dirty={isDirty("is_recommended")}
        />
        <Switch
          checked={draft.isRecommended}
          onCheckedChange={(checked: boolean) =>
            onDraftChange({ isRecommended: checked })
          }
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel
          text={pt("edit.validity")}
          dirty={isDirty("validity_period")}
        />
        <Popover open={validityOpen} onOpenChange={setValidityOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              <CalendarDays size={15} className="text-muted-foreground" />
              {draft.validityPeriod !== null
                ? dayjs(draft.validityPeriod).format("YYYY-MM-DD")
                : pt("edit.validity.empty")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={validityDate}
              onSelect={(date: Date | undefined) => {
                onDraftChange({
                  validityPeriod: date ? date.getTime() : null,
                });
                setValidityOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1.5">
        <FieldLabel text={pt("edit.riskLabel")} dirty={isDirty("risk_label")} />
        <div className="flex flex-wrap gap-1.5">
          {riskOptions.map((option: string) => (
            <ChipToggle
              key={option}
              label={option}
              active={draft.riskLabel.includes(option)}
              onClick={() =>
                onDraftChange({
                  riskLabel: toggleListValue(draft.riskLabel, option),
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel text={pt("edit.language")} dirty={isDirty("app_language")} />
        <Select
          value={draft.appLanguage}
          onValueChange={(value: string) => onDraftChange({ appLanguage: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={pt("feedback.ph.type")} />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map(
              (option: { value: string; label: string }) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <FieldLabel
          text={pt("edit.region")}
          dirty={isDirty("applicable_region")}
        />
        <div className="flex flex-wrap gap-1.5">
          {regionOptions.map((option: string) => (
            <ChipToggle
              key={option}
              label={option}
              active={draft.applicableRegion.includes(option)}
              onClick={() =>
                onDraftChange({
                  applicableRegion: toggleListValue(
                    draft.applicableRegion,
                    option,
                  ),
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-dashed border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground">
          {pt("edit.lockedTitle")}
        </p>
        <LockedRow
          label={pt("identity.kv.currentVersion")}
          value={material.currentVersion}
          reason={pt("lock.currentVersion")}
          mono
        />
        <LockedRow
          label={pt("identity.kv.model")}
          value={material.productModel ?? ""}
          reason={pt("lock.model")}
        />
        <LockedRow
          label={pt("identity.kv.type")}
          value={material.materialType}
          reason={pt("lock.type")}
        />
        <LockedRow
          label={pt("identity.kv.innerNo")}
          value={material.appMaterialId}
          reason={pt("lock.innerNo")}
          mono
        />
      </div>
    </div>
  );
};

export default MaterialEditPanel;
