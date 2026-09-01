import React, { useMemo } from "react";

import type { MaterialDetail } from "@shared/material";
import { PeopleName } from "@client/src/components/PeopleSelect";
import { useI18n } from "@client/src/hooks/use-i18n";
import { createMaterialDetailPt } from "./material-detail-i18n";
import { formatDateTime } from "./material-detail-utils";

interface ProvenanceSectionProps {
  material: MaterialDetail;
}

interface ProvenanceRowProps {
  label: string;
  children: React.ReactNode;
}

const ProvenanceRow: React.FC<ProvenanceRowProps> = ({ label, children }) => (
  <div className="flex items-center gap-3 border-b border-dashed border-border py-2 text-sm last:border-none">
    <span className="w-[96px] shrink-0 text-xs text-muted-foreground">
      {label}
    </span>
    <div className="min-w-0 flex-1 text-foreground">{children}</div>
  </div>
);

const ProvenanceSection: React.FC<ProvenanceSectionProps> = ({ material }) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-foreground">
        {pt("prov.title")}
      </h2>
      <ProvenanceRow label={pt("prov.planner")}>
        {material.plannerApprover ? (
          <PeopleName openId={material.plannerApprover} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </ProvenanceRow>
      <ProvenanceRow label={pt("prov.designer")}>
        {material.designer ? (
          <PeopleName openId={material.designer} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </ProvenanceRow>
      <ProvenanceRow label={pt("prov.publishTime")}>
        {material.publishTime ? (
          formatDateTime(material.publishTime)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </ProvenanceRow>
      <ProvenanceRow label={pt("prov.subscribers")}>
        {material.subscriber.length}
      </ProvenanceRow>
      <ProvenanceRow label={pt("prov.innerId")}>
        <span className="font-mono text-xs">{material.appInternalMaterialId}</span>
      </ProvenanceRow>
    </section>
  );
};

export default ProvenanceSection;
