// lib/context/AuthContext.js
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

  // ===================================
  // LOAD SESSION
  // ===================================
  
  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[AUTH] Loading session...");
      const data = await AuthAPI.getSession();
      console.log("[AUTH] Session loaded:", data);

      // Only update state if we got valid session data
      if (data) {
        setSession(data);
        // Merge portals array into user object so canAccessPortal() works
        const userWithPortals = data.user
          ? { ...data.user, portals: data.portals || data.user.portals || [] }
          : null;
        setUser(userWithPortals);
        setPortal(data.portal || null);
        setImpersonating(data.impersonating || false);
        setImpersonator(data.impersonator || null);
        console.log("[AUTH] Session state updated. User:", userWithPortals?.email, "Portal:", data.portal);
      } else {
        // No session found - clear state
        console.log("[AUTH] No session data returned");
        setSession(null);
        setUser(null);
        setPortal(null);
        setImpersonating(false);
        setImpersonator(null);
      }
      return data;
    } catch (err) {
      console.error("[AUTH] loadSession error:", err.message);
      // Don't log 401 errors as they're expected when not logged in
      if (err.message !== "UNAUTHENTICATED") {
        console.error("Failed to load session:", err);
      }

      // Clear session on error
      setSession(null);
      setUser(null);
      setPortal(null);
      setImpersonating(false);
      setImpersonator(null);

      // Only set error for unexpected errors
      if (err.message !== "UNAUTHENTICATED") {
        setError(err.message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // ===================================
  // AUTHENTICATION METHODS
  // ===================================
  
  const login = async (email, password) => {
    try {
      console.log("[AUTH] Login attempt:", email);
      const response = await AuthAPI.login(email, password);
      console.log("[AUTH] Login response:", response?.user);

      // MFA required — return early so the login page can redirect to /mfa-verify
      if (response?.requiresMFA) {
        console.log("[AUTH] MFA required, returning early");
        return response;
      }

      // Reload session after login
      console.log("[AUTH] MFA not required, loading session...");
      try {
        await loadSession();
        console.log("[AUTH] Session loaded successfully");
      } catch (sessionErr) {
        console.error("[AUTH] Session load failed:", sessionErr.message);
        throw sessionErr;
      }

      // Redirect to appropriate portal
      const defaultPortal = getDefaultPortal(response.user?.roles || []);
      console.log("[AUTH] Redirecting to portal:", defaultPortal);
      router.push(defaultPortal);

      return response;
    } catch (err) {
      console.error("[AUTH] Login error:", err.message);
      throw err;
    }
  };

  const register = async (data) => {
    try {
      const response = await AuthAPI.register(data);
      return response;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await AuthAPI.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear local state
      setSession(null);
      setUser(null);
      setPortal(null);
      setImpersonating(false);
      setImpersonator(null);
      
      // Redirect to login
      router.push("/login");
    }
  };

  // ===================================
  // IMPERSONATION METHODS
  // ===================================
  
  const startImpersonation = async (targetUserId, reason) => {
    try {
      const response = await ImpersonationAPI.start({ targetUserId, reason });

      // Backend always sets portal = "client" during impersonation.
      // Always redirect to client dashboard — the client layout allows
      // impersonating admins regardless of the target user's roles.
      await loadSession();
      router.push("/client/dashboard");

      return response;
    } catch (err) {
      throw err;
    }
  };

  const stopImpersonation = async (sessionId) => {
    try {
      await ImpersonationAPI.stop({ sessionId });

      // Backend already restored the admin cookie — just reload session
      await loadSession();

      router.push("/admin/dashboard");
    } catch (err) {
      throw err;
    }
  };

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
  // COMPUTED PROPERTIES
  // ===================================
  
  const isAuthenticated = Boolean(user);
  
  const isAdmin = hasAnyRole(["superadmin", "admin", "staff"]);
  
  const isClient = hasRole("client");
  
  const isReseller = hasRole("reseller");
  
  const isDeveloper = hasRole("developer");
  
  const isSuperAdmin = hasRole("superadmin");

  // ===================================
  // CONTEXT VALUE
  // ===================================
  
  const value = {
    // Session state
    session,
    user,
    portal,
    impersonating,
    impersonator,
    loading,
    error,
    
    // Auth methods
    login,
    register,
    logout,
    loadSession,
    
    // Impersonation
    startImpersonation,
    stopImpersonation,
    
    // Permission helpers
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessPortal,
    
    // Computed flags
    isAuthenticated,
    isAdmin,
    isClient,
    isReseller,
    isDeveloper,
    isSuperAdmin,
  };

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
  if (!roles || roles.length === 0) return "/login";
  
  // Priority order: admin > reseller > developer > client
  if (roles.includes("superadmin") || roles.includes("admin") || roles.includes("staff")) {
    return "/admin/dashboard";
  }
  if (roles.includes("reseller")) {
    return "/reseller/dashboard";
  }
  if (roles.includes("developer")) {
    return "/developer";
  }
  if (roles.includes("client")) {
    return "/client/dashboard";
  }
  
  return "/login";
}