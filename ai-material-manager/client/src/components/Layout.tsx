import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Inbox,
  Languages,
  Layers,
  LogOut,
  MoreHorizontal,
  Package,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@client/src/auth/auth-provider";
import { logger } from "@client/src/lib/logger";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@client/src/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@client/src/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@client/src/components/ui/alert-dialog";
import { Image } from "@client/src/components/ui/image";
import { useI18n } from "@client/src/hooks/use-i18n";
import { useIdentity } from "@client/src/hooks/use-identity";
import { useInbox } from "@client/src/inbox/inbox-provider";
import { useSystemSettings } from "@client/src/hooks/use-system-settings";
import GroupGuideDialog, {
  hasJoinedGroup,
} from "@client/src/components/GroupGuideDialog";

interface NavItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/inbox", labelKey: "nav.inbox", icon: Inbox },
  { path: "/library", labelKey: "nav.library", icon: Layers },
  { path: "/mine", labelKey: "nav.mine", icon: User },
  { path: "/more", labelKey: "nav.more", icon: MoreHorizontal },
];

const Layout: React.FC = () => {
  const { user: userInfo, logout } = useAuth();
  const appName = "AI 物料版本管理";
  const appLogo: string | null = null;
  const { language, t, setLanguage } = useI18n();
  const { identity } = useIdentity();
  const { items: inboxItems } = useInbox();
  const hasInboxDot =
    identity?.defaultLanding !== "inbox" && (inboxItems?.length ?? 0) > 0;
  const settings = useSystemSettings();
  const [logoutOpen, setLogoutOpen] = useState<boolean>(false);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  useEffect(() => {
    if (identity?.isUploadRole && !hasJoinedGroup()) {
      setGuideOpen(true);
    }
  }, [identity]);

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      logger.error("退出登录失败", error);
      return;
    }
  };

  const userBlock = (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-md">
        <Avatar className="size-8">
          {userInfo.avatarUrl ? (
            <AvatarImage
              src={userInfo.avatarUrl}
              alt={userInfo.name ?? "用户"}
            />
          ) : null}
          <AvatarFallback>
            <User className="size-4 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{userInfo.name ?? "游客"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="size-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="hidden md:flex sticky top-0 z-40 h-14 items-center gap-6 border-b border-border bg-card px-6">
        <div className="flex items-center gap-2">
          {appLogo ? (
            <Image
              src={appLogo}
              alt={appName ?? "应用"}
              className="size-7 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Package className="size-4" />
            </div>
          )}
          <span className="text-sm font-semibold">
            {appName ?? "AI 物料版本管理"}
          </span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item: NavItem) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }: { isActive: boolean }) =>
                `relative flex min-h-[38px] items-center gap-1.5 rounded-md px-3 text-sm transition-colors duration-[var(--duration-fast)] ${
                  isActive
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <item.icon className="size-4" />
                  <span>{t(item.labelKey)}</span>
                  {item.path === "/inbox" && hasInboxDot && !isActive ? (
                    <span className="absolute right-1 top-2 size-1.5 rounded-full bg-destructive" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/40">
              <Languages className="size-4" />
              <span className="font-medium">
                {language === "zh" ? "中文" : "EN"}
              </span>
              <ChevronDown className="size-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setLanguage("zh")}>
                中文
                {language === "zh" ? (
                  <Check className="ml-auto size-4" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("en")}>
                English
                {language === "en" ? (
                  <Check className="ml-auto size-4" />
                ) : null}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {userBlock}
        </div>
      </header>

      {identity?.isVisitor ? (
        <div className="sticky top-0 z-30 border-b border-warning/30 bg-warning-soft px-4 py-2 text-center text-sm font-medium text-warning-text md:top-14">
          {t("identity.visitorBanner")}
        </div>
      ) : null}

      <main className="pb-20 md:pb-8">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-5 md:px-8 md:py-7">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card md:hidden">
        {NAV_ITEMS.map((item: NavItem) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }: { isActive: boolean }) =>
              `relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs transition-colors duration-[var(--duration-fast)] ${
                isActive ? "font-medium text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <item.icon className="size-5" />
                <span>{t(item.labelKey)}</span>
                {item.path === "/inbox" && hasInboxDot && !isActive ? (
                  <span className="absolute right-[calc(50%-16px)] top-2 size-1.5 rounded-full bg-destructive" />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后需要重新登录才能继续使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleLogout()}>
              退出登录
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <GroupGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        settings={settings}
      />
    </div>
  );
};

export default Layout;
