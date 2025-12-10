"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AuthAPI } from "@/lib/auth";
import { setAuthHeader, saveImpersonationTokenToSession } from "@/lib/api";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
export type AuthUser = {
  id: string;
  email: string;
  roles?: string[];
  portals?: string[];
  mfaVerified?: boolean;
  isImpersonation?: boolean;
  impersonatorId?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;

  login: (creds: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;

  impersonateStart: (
    targetUserId: string,
    reason?: string
  ) => Promise<{ success: boolean; message?: string }>;

  impersonateStop: (
    sessionId?: string
  ) => Promise<{ success: boolean; message?: string }>;

  isImpersonating: boolean;
  impersonatorId?: string | null;

  redirectToPortal: (u?: AuthUser | null) => void;
};

// ---------------------------------------------------------------------------
// CONTEXT
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// PROVIDER
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatorId, setImpersonatorId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // USER LOAD
  // ---------------------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await AuthAPI.me();
      const u = (res as any)?.user ?? null;

      setUser(u);
      setIsImpersonating(Boolean(u?.isImpersonation));
      setImpersonatorId(u?.impersonatorId || null);

      return u;
    } catch {
      setUser(null);
      setIsImpersonating(false);
      setImpersonatorId(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(); // auto-load on mount
  }, [load]);

  // ---------------------------------------------------------------------------
  // REDIRECT ROUTER LOGIC
  // ---------------------------------------------------------------------------
 const redirectToPortal = useCallback(
  (u: AuthUser | null = user) => {
    if (!u) return;

    const roles = u.roles ?? [];

    if (roles.some((r) => ["admin", "superadmin", "staff"].includes(r))) {
      router.replace("/admin");
    } else if (roles.includes("reseller")) {
      router.replace("/reseller");
    } else if (roles.includes("developer")) {
      router.replace("/developer");
    } else {
      router.replace("/clients/dashboard");  // ✅ FIXED
    }
  },
  [router, user]
);


  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------
  const login = useCallback(
    async (creds: { email: string; password: string }) => {
      setLoading(true);
      try {
        await AuthAPI.login(creds as any);
        await load();
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------
  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await AuthAPI.logout();
    } finally {
      // reset all state
      saveImpersonationTokenToSession(null);
      setAuthHeader(null);

      setUser(null);
      setIsImpersonating(false);
      setImpersonatorId(null);

      setLoading(false);
      router.replace("/auth/login");
    }
  }, [router]);

  // ---------------------------------------------------------------------------
  // IMPERSONATION START
  // ---------------------------------------------------------------------------
  const impersonateStart = useCallback(
    async (targetUserId: string, reason?: string) => {
      try {
        const res: any = await AuthAPI.impersonateStart({
          targetUserId,
          reason,
        } as any);

        // 1) Try cookie-based impersonation
        const u = await load();
        if (u?.isImpersonation) {
          setIsImpersonating(true);
          setImpersonatorId(u.impersonatorId ?? null);
          redirectToPortal(u);
          return { success: true };
        }

        // 2) Token fallback
        if (res?.accessToken) {
          saveImpersonationTokenToSession(res.accessToken);
          setAuthHeader(res.accessToken);

          if (res?.refreshToken) {
            try {
              sessionStorage.setItem(
                "impersonation_refresh_token",
                res.refreshToken
              );
            } catch {}
          }

          const newUser = await load();

          if (newUser?.isImpersonation) {
            setIsImpersonating(true);
            setImpersonatorId(newUser.impersonatorId ?? null);
            redirectToPortal(newUser);
            return { success: true };
          }
        }

        return {
          success: false,
          message: "Impersonation did not complete.",
        };
      } catch (err: any) {
        console.error("impersonateStart error", err);
        return {
          success: false,
          message: err?.message ?? "Impersonation failed",
        };
      }
    },
    [load, redirectToPortal]
  );

  // ---------------------------------------------------------------------------
  // IMPERSONATION STOP
  // ---------------------------------------------------------------------------
  const impersonateStop = useCallback(
    async (sessionId?: string) => {
      try {
        await AuthAPI.impersonateStop({ sessionId } as any);

        saveImpersonationTokenToSession(null);
        setAuthHeader(null);

        // Try forcing refresh cookie (if backend supports)
        try {
          await AuthAPI.refresh({} as any);
        } catch {}

        const u = await load();

        if (!u) {
          router.replace("/auth/login");
          return { success: true };
        }

        if (!u.isImpersonation) {
          setIsImpersonating(false);
          setImpersonatorId(null);
          redirectToPortal(u);
          return { success: true };
        }

        return {
          success: false,
          message: "Still impersonating after stop — admin session not restored.",
        };
      } catch (err: any) {
        console.error("impersonateStop error", err);
        return {
          success: false,
          message: err?.message ?? "Failed to stop impersonation",
        };
      }
    },
    [load, redirectToPortal, router]
  );

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------
  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      reload: load,

      impersonateStart,
      impersonateStop,
      isImpersonating,
      impersonatorId,

      redirectToPortal,
    }),
    [
      user,
      loading,
      login,
      logout,
      load,
      impersonateStart,
      impersonateStop,
      isImpersonating,
      impersonatorId,
      redirectToPortal,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuth must be used inside an <AuthProvider/> wrapper");
  return ctx;
}
