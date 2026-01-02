// lib/context/AuthContext.js
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthAPI } from "@/lib/api/auth";
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
      
      const data = await AuthAPI.getSession();
      
      // Only update state if we got valid session data
      if (data) {
        setSession(data);
        setUser(data.user || null);
        setPortal(data.portal || null);
        setImpersonating(data.impersonating || false);
        setImpersonator(data.impersonator || null);
      } else {
        // No session found - clear state
        setSession(null);
        setUser(null);
        setPortal(null);
        setImpersonating(false);
        setImpersonator(null);
      }
    } catch (err) {
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
      const response = await AuthAPI.login(email, password);
      
      // Reload session after login
      await loadSession();
      
      // Redirect to appropriate portal
      const defaultPortal = getDefaultPortal(response.user?.roles || []);
      router.push(defaultPortal);
      
      return response;
    } catch (err) {
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
      const response = await AuthAPI.startImpersonation(targetUserId, reason);
      
      // Reload session with impersonated user
      await loadSession();
      
      // Redirect to client portal
      router.push("/client/dashboard");
      
      return response;
    } catch (err) {
      throw err;
    }
  };

  const stopImpersonation = async (sessionId) => {
    try {
      await AuthAPI.stopImpersonation(sessionId);
      
      // Reload session as admin
      await loadSession();
      
      // Redirect back to admin
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
    return "/developer/dashboard";
  }
  if (roles.includes("client")) {
    return "/client/dashboard";
  }
  
  return "/login";
}