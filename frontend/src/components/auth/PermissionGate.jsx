// components/auth/PermissionGate.jsx
"use client";

import { useAuth } from "@/lib/context/AuthContext";

/**
 * Permission-based conditional rendering component
 * 
 * Usage:
 * <PermissionGate permissions={["admin.users.edit"]}>
 *   <EditUserButton />
 * </PermissionGate>
 */
export function PermissionGate({ 
  permissions = [], 
  requireAll = false, 
  fallback = null,
  children 
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  // Single permission check
  if (typeof permissions === "string") {
    return hasPermission(permissions) ? children : fallback;
  }

  // Multiple permissions check
  const hasAccess = requireAll 
    ? hasAllPermissions(permissions) 
    : hasAnyPermission(permissions);

  return hasAccess ? children : fallback;
}