import React from "react";
import { CheckCircle2, CircleDashed, QrCode, User } from "lucide-react";

import { useAuth } from "@client/src/auth/auth-provider";
import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import { Skeleton } from "@client/src/components/ui/skeleton";
import { useI18n } from "@client/src/hooks/use-i18n";
import { useIdentity } from "@client/src/hooks/use-identity";
import { makePt } from "./mine-i18n";

export interface MineIdentityCardProps {
  joined: boolean;
  onShowGroupGuide: () => void;
}

/** 顶部身份卡：姓名、角色、市场码、默认落地页、进群状态 */
const MineIdentityCard: React.FC<MineIdentityCardProps> = ({
  joined,
  onShowGroupGuide,
}) => {
  const { user: profile } = useAuth();
  const { identity, loading } = useIdentity();
  const { language, t } = useI18n();
  const pt = makePt(language, t);

  return (
    <div className="flex-1 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary-soft">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-[15px] font-semibold">
              {profile.name ?? pt("mine.guest")}
            </p>
            <p className="text-xs text-muted-foreground">{pt("mine.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {joined ? (
            <Badge className="gap-1 bg-success-foreground text-success">
              <CheckCircle2 className="size-3" />
              {pt("mine.groupJoined")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <CircleDashed className="size-3" />
              {pt("mine.groupNotJoined")}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onShowGroupGuide}>
            <QrCode className="size-3.5" />
            {pt("mine.viewQr")}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">{pt("mine.roles")}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-4 w-24" />
          ) : identity && identity.roles.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {identity.roles.map((role: string) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-muted-foreground">{pt("mine.roleNone")}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{pt("mine.area")}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-4 w-16" />
          ) : (
            <p className="mt-1 font-mono text-sm">
              {identity?.area ?? pt("mine.areaNone")}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{pt("mine.landing")}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-4 w-20" />
          ) : (
            <p className="mt-1">
              {identity?.defaultLanding === "inbox"
                ? pt("mine.landing.inbox")
                : pt("mine.landing.library")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MineIdentityCard;
