import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { axiosForBackend } from "@client/src/lib/api-client";
import { clearQueryCache } from "@client/src/lib/query-client";

export interface SessionUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: SessionUser;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** 只记住“上次是谁登录”，用于秒开界面；真正的登录态仍由 HttpOnly 会话 Cookie 决定 */
const LAST_USER_STORAGE_KEY = "amm.last-user.v1";

function readLastUser(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(LAST_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (typeof parsed.userId !== "string" || typeof parsed.name !== "string") {
      return null;
    }
    return {
      userId: parsed.userId,
      name: parsed.name,
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
    };
  } catch {
    return null;
  }
}

function writeLastUser(user: SessionUser | null): void {
  try {
    if (user) {
      window.localStorage.setItem(LAST_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(LAST_USER_STORAGE_KEY);
    }
  } catch {
    // 存储不可用时退化为每次等待 /api/auth/me
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 老用户：先用上次的身份渲染界面，同时后台确认会话；会话失效时 401 拦截器会跳转登录
  const [user, setUser] = useState<SessionUser | null>(readLastUser);

  useEffect(() => {
    let active = true;
    axiosForBackend
      .get<SessionUser>("/api/auth/me")
      .then((response) => {
        if (!active) return;
        const next = response.data;
        const previous = readLastUser();
        if (previous && previous.userId !== next.userId) {
          // 换了账号：丢弃上一位用户的本地缓存
          clearQueryCache();
        }
        writeLastUser(next);
        setUser(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue | null>(
    () =>
      user
        ? {
            user,
            logout: async () => {
              await axiosForBackend.post("/api/auth/logout");
              writeLastUser(null);
              clearQueryCache();
              window.location.assign("/api/auth/login?next=/library");
            },
          }
        : null,
    [user],
  );

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="正在登录" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
