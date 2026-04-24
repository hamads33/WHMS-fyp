// lib/context/AuthContext.js
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, startTransition } from "react";
import { AuthAPI } from "@/lib/api/auth";
import { ImpersonationAPI } from "@/lib/impersonation";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [portal, setPortal] = useState(null);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonator, setImpersonator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const router = useRouter();

  const clearSessionState = useCallback(() => {
    setSession(null);
    setUser(null);
    setPortal(null);
    setImpersonating(false);
    setImpersonator(null);
  }, []);

  const applySessionState = useCallback((data) => {
    if (!data?.user) {
      clearSessionState();
      return null;
    }

    const nextUser = {
      ...data.user,
      permissions: data.user.permissions || [],
      portals: data.portals || data.user.portals || [],
    };

    const nextSession = {
      user: nextUser,
      portal: data.portal || null,
      portals: nextUser.portals,
      impersonating: data.impersonating || false,
      impersonator: data.impersonator || null,
    };

    setSession(nextSession);
    setUser(nextUser);
    setPortal(nextSession.portal);
    setImpersonating(nextSession.impersonating);
    setImpersonator(nextSession.impersonator);

    return nextSession;
  }, [clearSessionState]);

  // ===================================
  // LOAD SESSION
  // ===================================
  
  const loadSession = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const data = await AuthAPI.getSession({
        redirectOn401: false,
        ...options,
      });
      return applySessionState(data);
    } catch (err) {
      clearSessionState();

      // Only set error for unexpected errors
      if (err.message !== "UNAUTHENTICATED") {
        setError(err.message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applySessionState, clearSessionState]);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // ===================================
  // AUTHENTICATION METHODS
  // ===================================
  
  const login = useCallback(async (email, password) => {
    try {
      const response = await AuthAPI.login(email, password);

      // MFA required — return early so the login page can redirect to /mfa-verify
      if (response?.requiresMFA) {
        return response;
      }

      const portal = response.portal || getPortalName(response.user?.roles || []);
      applySessionState({
        user: response.user,
        portal,
        portals: response.user?.portals || getPortalsFromRoles(response.user?.roles || []),
        impersonating: false,
        impersonator: null,
      });

      startTransition(() => {
        router.push(getDefaultPortal(response.user?.roles || []));
      });

      loadSession().catch((sessionErr) => {
        if (sessionErr?.message !== "UNAUTHENTICATED") {
          setError(sessionErr.message);
        }
      });

      return response;
    } catch (err) {
      throw err;
    }
  }, [applySessionState, loadSession]);

  const register = useCallback(async (data) => {
    try {
      const response = await AuthAPI.register(data);
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthAPI.logout();
    } finally {
      clearSessionState();
      router.push("/login");
    }
  }, [clearSessionState]);

  // ===================================
  // IMPERSONATION METHODS
  // ===================================
  
  const startImpersonation = useCallback(async (targetUserId, reason) => {
    try {
      const response = await ImpersonationAPI.start({ targetUserId, reason });
      await loadSession();
      router.push("/client/dashboard");
      return response;
    } catch (err) {
      throw err;
    }
  }, [loadSession]);

  const stopImpersonation = useCallback(async (sessionId) => {
    try {
      await ImpersonationAPI.stop({ sessionId });
      await loadSession();
      router.push("/admin/dashboard");
    } catch (err) {
      throw err;
    }
  }, [loadSession]);

  // ===================================
  // PERMISSION HELPERS
  // ===================================
  
  const hasRole = useCallback((role) => {
    if (!user?.roles) return false;
    return user.roles.includes(role);
  }, [user]);

  const hasAnyRole = useCallback((roles) => {
    if (!user?.roles) return false;
    return roles.some((role) => user.roles.includes(role));
  }, [user]);

  const hasAllRoles = useCallback((roles) => {
    if (!user?.roles) return false;
    return roles.every((role) => user.roles.includes(role));
  }, [user]);

  const hasPermission = useCallback((permission) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions) => {
    if (!user?.permissions) return false;
    return permissions.some((perm) => user.permissions.includes(perm));
  }, [user]);

  const hasAllPermissions = useCallback((permissions) => {
    if (!user?.permissions) return false;
    return permissions.every((perm) => user.permissions.includes(perm));
  }, [user]);

  const canAccessPortal = useCallback((portalName) => {
    if (!user?.portals) return false;
    return user.portals.includes(portalName);
  }, [user]);

  // ===================================
  // CONTEXT VALUE
  // ===================================
  
  const value = useMemo(() => ({
    session,
    user,
    portal,
    impersonating,
    impersonator,
    loading,
    error,
    login,
    register,
    logout,
    loadSession,
    startImpersonation,
    stopImpersonation,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessPortal,
    isAuthenticated: Boolean(user),
    isAdmin: hasAnyRole(["superadmin", "admin", "staff"]),
    isClient: hasRole("client"),
    isReseller: hasRole("reseller"),
    isDeveloper: hasRole("developer"),
    isSuperAdmin: hasRole("superadmin"),
  }), [
    session, user, portal, impersonating, impersonator, loading, error,
    login, register, logout, loadSession, startImpersonation, stopImpersonation,
    hasRole, hasAnyRole, hasAllRoles, hasPermission, hasAnyPermission, hasAllPermissions, canAccessPortal,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

// ===================================
// HELPER FUNCTIONS
// ===================================

function getDefaultPortal(roles) {
  switch (getPortalName(roles)) {
    case "admin":
      return "/admin/dashboard";
    case "reseller":
      return "/reseller/dashboard";
    case "developer":
      return "/developer";
    case "client":
      return "/client/dashboard";
    default:
      return "/login";
  }
}

function getPortalName(roles) {
  if (!roles || roles.length === 0) return null;
  if (roles.includes("superadmin") || roles.includes("admin") || roles.includes("staff")) return "admin";
  if (roles.includes("reseller")) return "reseller";
  if (roles.includes("developer")) return "developer";
  if (roles.includes("client")) return "client";
  return null;
}

function getPortalsFromRoles(roles) {
  const portals = [];
  if (!roles || roles.length === 0) return portals;
  if (roles.includes("superadmin") || roles.includes("admin") || roles.includes("staff")) portals.push("admin");
  if (roles.includes("client")) portals.push("client");
  if (roles.includes("reseller")) portals.push("reseller");
  if (roles.includes("developer")) portals.push("developer");
  return portals;
}
