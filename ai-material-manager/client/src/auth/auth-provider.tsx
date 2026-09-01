import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { axiosForBackend } from "@client/src/lib/api-client";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;
    axiosForBackend
      .get<SessionUser>("/api/auth/me")
      .then((response) => {
        if (active) setUser(response.data);
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
