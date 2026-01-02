// components/auth/ProtectedRoute.jsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Protected route wrapper with role/permission checks
 * 
 * Usage:
 * <ProtectedRoute roles={["admin"]}>
 *   <AdminDashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ 
  children, 
  roles = null, 
  permissions = null,
  requireAll = false,
  redirectTo = "/login",
  loadingComponent = null,
}) {
  const router = useRouter();
  const { 
    isAuthenticated, 
    loading, 
    hasAnyRole, 
    hasAllRoles,
    hasAnyPermission,
    hasAllPermissions,
  } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check roles if specified
    if (roles) {
      const roleArray = Array.isArray(roles) ? roles : [roles];
      const hasRoleAccess = requireAll 
        ? hasAllRoles(roleArray)
        : hasAnyRole(roleArray);

      if (!hasRoleAccess) {
        router.push("/unauthorized");
        return;
      }
    }

    // Check permissions if specified
    if (permissions) {
      const permArray = Array.isArray(permissions) ? permissions : [permissions];
      const hasPermAccess = requireAll
        ? hasAllPermissions(permArray)
        : hasAnyPermission(permArray);

      if (!hasPermAccess) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [
    loading, 
    isAuthenticated, 
    roles, 
    permissions, 
    requireAll,
    redirectTo,
    router,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission,
    hasAllPermissions,
  ]);

  // Show loading state
  if (loading) {
    return loadingComponent || (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated and authorized
  return <>{children}</>;
}