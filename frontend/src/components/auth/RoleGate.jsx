// components/auth/RoleGate.jsx
"use client";

import { useAuth } from "@/lib/context/AuthContext";

/**
 * Role-based conditional rendering component
 * 
 * Usage:
 * <RoleGate roles={["admin", "superadmin"]}>
 *   <AdminOnlyContent />
 * </RoleGate>
 */
export function RoleGate({ 
  roles = [], 
  requireAll = false, 
  fallback = null,
  children 
}) {
  const { hasRole, hasAnyRole, hasAllRoles } = useAuth();

  // Single role check
  if (typeof roles === "string") {
    return hasRole(roles) ? children : fallback;
  }

  // Multiple roles check
  const hasAccess = requireAll 
    ? hasAllRoles(roles) 
    : hasAnyRole(roles);

  return hasAccess ? children : fallback;
}