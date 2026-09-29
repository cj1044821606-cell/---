import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Bot,
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
import AgentTutorialDialog from "@client/src/components/agent-tutorial/AgentTutorialDialog";
import { TUTORIAL_I18N } from "@client/src/components/agent-tutorial/tutorial-i18n";
import {
  flyIntoLauncher,
  hasSeenAgentTutorial,
  markAgentTutorialSeen,
} from "@client/src/components/agent-tutorial/tutorial-state";
import { useScrollRestoration } from "@client/src/hooks/use-scroll-restoration";
import { preloadPage, type PageName } from "@client/src/lib/page-loaders";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  page: PageName;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/inbox", labelKey: "nav.inbox", icon: Inbox, page: "inbox" },
  { path: "/library", labelKey: "nav.library", icon: Layers, page: "library" },
  { path: "/mine", labelKey: "nav.mine", icon: User, page: "mine" },
  { path: "/more", labelKey: "nav.more", icon: MoreHorizontal, page: "more" },
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
  // 入群引导处理完（不需要或已关闭）后，才轮到 Codex 教程，避免两个弹窗叠在一起
  const [guideSettled, setGuideSettled] = useState<boolean>(false);
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [launcherPulse, setLauncherPulse] = useState<boolean>(false);
  const [parkedHint, setParkedHint] = useState<boolean>(false);
  const tutorialAutoShown = useRef<boolean>(false);
  const desktopLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileLauncherRef = useRef<HTMLButtonElement>(null);
  const tt = (key: string): string =>
    TUTORIAL_I18N[key]?.[language] ?? t(key);
  // 访客没有业务数据权限，不提供 AI 助手接入，也就不需要教程
  const canUseAgent: boolean = identity !== null && !identity.isVisitor;
  useScrollRestoration();

  useEffect(() => {
    if (!identity) return;
    if (identity.isUploadRole && !hasJoinedGroup()) {
      setGuideOpen(true);
    } else {
      setGuideSettled(true);
    }
  }, [identity]);

  const onGuideOpenChange = (open: boolean): void => {
    setGuideOpen(open);
    if (!open) setGuideSettled(true);
  };

  useEffect(() => {
    if (!guideSettled || !canUseAgent || tutorialAutoShown.current) return;
    if (hasSeenAgentTutorial()) return;
    tutorialAutoShown.current = true;
    const timer = window.setTimeout(() => setTutorialOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, [guideSettled, canUseAgent]);

  /** 关闭教程：弹窗缩小飞进入口图标，图标闪一下；第一次还会提示“教程收在这里” */
  const parkTutorial = (rect: DOMRect | null): void => {
    const firstTime = !hasSeenAgentTutorial();
    markAgentTutorialSeen();
    setTutorialOpen(false);
    const visibleLauncher =
      [desktopLauncherRef.current, mobileLauncherRef.current].find(
        (el) => el !== null && el.getBoundingClientRect().width > 0,
      ) ?? null;
    flyIntoLauncher(rect, visibleLauncher, () => {
      setLauncherPulse(true);
      window.setTimeout(() => setLauncherPulse(false), 1600);
      if (firstTime) {
        setParkedHint(true);
        window.setTimeout(() => setParkedHint(false), 4500);
      }
    });
  };

  const launcherButton = (
    ref: React.RefObject<HTMLButtonElement | null>,
    className: string,
    hintClassName: string,
  ): React.ReactNode => (
    <div className={cn("relative", className)}>
      <button
        ref={ref}
        type="button"
        aria-label={tt("tutorial.launcher")}
        title={tt("tutorial.launcher")}
        onClick={() => {
          setParkedHint(false);
          setTutorialOpen(true);
        }}
        className="relative grid size-9 place-items-center rounded-lg bg-primary-soft text-primary outline-none transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-primary-line focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Bot className="size-[18px]" />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-coral ring-2 ring-card" />
        {launcherPulse ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-lg bg-primary/25"
          />
        ) : null}
      </button>
      {parkedHint ? (
        <div
          role="status"
          className={cn(
            "animate-in fade-in-0 zoom-in-95 absolute z-50 w-max max-w-[14rem] rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg duration-200",
            hintClassName,
          )}
        >
          {tt("tutorial.parked")}
        </div>
      ) : null}
    </div>
  );

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
    <div className="relative min-h-screen bg-background text-foreground">
      {/* 页面顶部淡淡的蓝、珊瑚两团光晕，让底色不那么单调；固定在视口，不随内容滚动 */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(900px_320px_at_8%_-10%,hsl(214_100%_92%/0.75),transparent),radial-gradient(700px_300px_at_100%_-5%,hsl(7_100%_93%/0.6),transparent)]"
      />
      <header className="sticky top-0 z-40 hidden h-14 items-center gap-6 border-b border-border bg-card/85 px-6 shadow-[0_1px_0_rgba(16,24,40,0.02)] backdrop-blur-md md:flex">
        <div className="flex items-center gap-2">
          {appLogo ? (
            <Image
              src={appLogo}
              alt={appName ?? "应用"}
              className="size-7 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-lg bg-brand text-primary-foreground shadow-sm">
              <Package className="size-4" />
            </div>
          )}
          <span className="text-sm font-semibold tracking-tight">
            {appName ?? "AI 物料版本管理"}
          </span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item: NavItem) => (
            <NavLink
              key={item.path}
              to={item.path}
              onPointerEnter={() => preloadPage(item.page)}
              onFocus={() => preloadPage(item.page)}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  "relative flex min-h-[38px] items-center gap-1.5 rounded-md px-3 text-sm transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  isActive
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <item.icon className="size-4" />
                  <span>{t(item.labelKey)}</span>
                  {item.path === "/inbox" && hasInboxDot && !isActive ? (
                    <span className="absolute right-1 top-2 size-1.5 rounded-full bg-destructive ring-2 ring-card" />
                  ) : null}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-brand"
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {canUseAgent
            ? launcherButton(
                desktopLauncherRef,
                "",
                "right-0 top-[calc(100%+8px)]",
              )
            : null}
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

      <main className="relative pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-5 md:px-8 md:py-7">
          <Outlet />
        </div>
      </main>

      {canUseAgent
        ? launcherButton(
            mobileLauncherRef,
            "fixed right-4 bottom-[calc(7.75rem+env(safe-area-inset-bottom))] z-30 rounded-lg bg-card shadow-lg md:hidden",
            "right-[calc(100%+8px)] top-1/2 -translate-y-1/2",
          )
        : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_ITEMS.map((item: NavItem) => (
          <NavLink
            key={item.path}
            to={item.path}
            onTouchStart={() => preloadPage(item.page)}
            className={({ isActive }: { isActive: boolean }) =>
              cn(
                "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs transition-colors duration-[var(--duration-fast)] active:bg-accent",
                isActive ? "font-medium text-primary" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-brand"
                  />
                ) : null}
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
        onOpenChange={onGuideOpenChange}
        settings={settings}
      />
      {canUseAgent ? (
        <AgentTutorialDialog
          open={tutorialOpen}
          onClose={parkTutorial}
        />
      ) : null}
    </div>
  );
};

export default Layout;
