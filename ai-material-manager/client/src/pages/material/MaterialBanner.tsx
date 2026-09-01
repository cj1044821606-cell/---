import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";

import type { VersionBanner } from "@shared/material";
import { Button } from "@client/src/components/ui/button";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";

interface MaterialBannerProps {
  banner: VersionBanner;
}

const MaterialBanner: React.FC<MaterialBannerProps> = ({ banner }) => {
  const navigate = useNavigate();
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);

  if (banner.mode === "currentVersion") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary-line bg-accent px-4 py-3 text-sm text-accent-foreground">
        <Info size={16} className="shrink-0" />
        <span>{pt("banner.current")}</span>
      </div>
    );
  }

  const goToNewVersion = (): void => {
    if (banner.newVersionMaterialId) {
      navigate(`/material/${banner.newVersionMaterialId}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3">
      <AlertTriangle size={16} className="shrink-0 text-warning-text" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-warning-text">
          {pt("banner.old.title")}
        </p>
        <p className="text-xs text-warning-text">
          {pt("banner.old.desc")}
        </p>
      </div>
      {banner.newVersionMaterialId ? (
        <Button size="sm" variant="outline" onClick={goToNewVersion}>
          {pt("banner.old.cta")}
          <ArrowRight size={13} />
        </Button>
      ) : null}
    </div>
  );
};

export default MaterialBanner;
