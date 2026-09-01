import React, { useMemo } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import type { MaterialDetail } from "@shared/material";
import {
  isExternalShareReady,
  type MaterialStatusLabel,
} from "@shared/status";
import { Button } from "@client/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialDetail;
  statusLabel: MaterialStatusLabel;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  material,
  statusLabel,
}) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);

  // 硬闸门二次校验
  const allowed: boolean = isExternalShareReady(
    material.allowExternalSend,
    statusLabel,
  );

  const handleConfirm = (): void => {
    if (!allowed) {
      return;
    }
    toast.success(pt("share.success"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{pt("share.title")}</DialogTitle>
          <DialogDescription>{pt("share.desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-md bg-background p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-[72px] shrink-0 text-xs text-muted-foreground">
              {pt("share.file")}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
              {material.standardName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[72px] shrink-0 text-xs text-muted-foreground">
              {pt("share.version")}
            </span>
            <span className="font-mono text-xs text-foreground">
              {material.currentVersion}
            </span>
          </div>
        </div>
        {!allowed ? (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-danger-text">
            {pt("share.blocked")}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {pt("edit.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!allowed}>
            <ShieldCheck size={15} />
            {pt("share.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
