import React, { useMemo } from "react";

import { Button } from "@client/src/components/ui/button";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";

interface EditMaterialBarProps {
  dirtyCount: number;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const EditMaterialBar: React.FC<EditMaterialBarProps> = ({
  dirtyCount,
  saving,
  onSave,
  onCancel,
}) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card shadow-[0_-4px_16px_rgba(16_24_40_0.08)]">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <p className="flex-1 text-sm text-muted-foreground">
          {pt("edit.dirtyHint", { n: dirtyCount })}
        </p>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          {pt("edit.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || dirtyCount === 0}
        >
          {saving ? pt("edit.saving") : pt("edit.save")}
        </Button>
      </div>
    </div>
  );
};

export default EditMaterialBar;
