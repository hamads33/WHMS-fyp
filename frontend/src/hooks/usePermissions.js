// lib/hooks/usePermissions.js
"use client";

import { useAuth } from "@/lib/context/AuthContext";

/**
 * Hook for permission-based UI rendering
 */
export function usePermissions() {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  const permissions = user?.permissions || [];

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Quick permission checks
    canManageUsers: hasPermission("admin.manage.users"),
    canViewAuditLogs: hasPermission("admin.audit.view"),
    canImpersonate: hasPermission("impersonation.start"),
    canManageRoles: hasPermission("admin.manage.roles"),
    canManagePermissions: hasPermission("admin.manage.permissions"),
    canManageIpRules: hasPermission("admin.ip_rules.manage"),
  };
}