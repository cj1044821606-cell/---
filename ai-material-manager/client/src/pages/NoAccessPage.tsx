import React from "react";
import { LogOut, RefreshCcw, ShieldOff } from "lucide-react";

import type { AccessBlock } from "@shared/access";
import { useAuth } from "@client/src/auth/auth-provider";
import { Button } from "@client/src/components/ui/button";
import { useI18n } from "@client/src/hooks/use-i18n";

const COPY: Record<AccessBlock, Record<"zh" | "en", { title: string; body: string }>> = {
  notInDivision: {
    zh: {
      title: "暂无访问权限",
      body: "本系统仅对储能事业部开放。如需使用，请联系系统维护者。",
    },
    en: {
      title: "No access",
      body: "This system is only available to the Energy Storage Division. Contact a system maintainer if you need access.",
    },
  },
  unverified: {
    zh: { title: "暂时无法验证部门", body: "请稍后刷新重试。" },
    en: { title: "Can't verify your department", body: "Please refresh and try again later." },
  },
};

const NoAccessPage: React.FC<{ reason: AccessBlock }> = ({ reason }) => {
  const { language } = useI18n();
  const { logout } = useAuth();
  const copy = COPY[reason][language];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 text-center shadow-sm">
        <ShieldOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h1 className="mt-3 text-base font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        <div className="mt-5 flex justify-center gap-2">
          {reason === "unverified" ? (
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCcw className="size-4" />
              {language === "zh" ? "重试" : "Retry"}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => void logout()}>
            <LogOut className="size-4" />
            {language === "zh" ? "退出登录" : "Sign out"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPage;
