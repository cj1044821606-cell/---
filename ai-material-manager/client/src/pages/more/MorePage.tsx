import React from "react";

import { useI18n } from "@client/src/hooks/use-i18n";
import PageHeader from "@client/src/components/PageHeader";
import { useIdentity } from "@client/src/hooks/use-identity";
import { AgentAccessCard } from "./AgentAccessCard";
import { MoreOpsView } from "./MoreOpsView";
import { MoreQuickReference } from "./MoreQuickReference";
import { MORE_I18N } from "./more-i18n";

const MorePage: React.FC = () => {
  const { language, t } = useI18n();
  const { identity } = useIdentity();

  const pt = (key: string): string => MORE_I18N[key]?.[language] ?? t(key);
  const isMaintainer: boolean = identity?.isMaintainer === true;
  // 访客没有业务数据权限，不提供 AI 助手接入
  const canUseAgent: boolean = identity !== null && !identity.isVisitor;

  return (
    <div className="space-y-6">
      <PageHeader
        title={pt("more.title")}
        meta={pt("more.subtitle")}
      />

      <MoreQuickReference />

      {canUseAgent ? <AgentAccessCard /> : null}

      {isMaintainer ? <MoreOpsView /> : null}
    </div>
  );
};

export default MorePage;
