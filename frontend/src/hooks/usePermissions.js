// lib/hooks/usePermissions.js
"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { PERMISSIONS } from "@/lib/constants/permissions";

/**
 * Hook for permission-based UI rendering.
 * All keys match the backend permissions.json exactly.
 */
export function usePermissions() {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  const permissions = user?.permissions || [];

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Admin portal
    canAccessAdmin:         hasPermission(PERMISSIONS.ADMIN_ACCESS),
    canManageStaff:         hasPermission(PERMISSIONS.ADMIN_MANAGE_STAFF),
    canUpdateSettings:      hasPermission(PERMISSIONS.ADMIN_SETTINGS),

    // Users
    canViewUsers:           hasPermission(PERMISSIONS.USERS_VIEW),
    canDeactivateUsers:     hasPermission(PERMISSIONS.USERS_DEACTIVATE),
    canAssignRoles:         hasPermission(PERMISSIONS.USERS_ROLES_ASSIGN),
    canImpersonate:         hasPermission(PERMISSIONS.USERS_IMPERSONATE),
    canForceLogout:         hasPermission(PERMISSIONS.USERS_LOGOUT_FORCE),

    // Roles
    canViewRoles:           hasPermission(PERMISSIONS.ROLES_VIEW),
    canManageRolePerms:     hasPermission(PERMISSIONS.ROLES_PERMISSIONS_ASSIGN),

    // Services
    canViewServices:        hasPermission(PERMISSIONS.SERVICES_VIEW),
    canManageServices:      hasPermission(PERMISSIONS.SERVICES_MANAGE),

    // Orders (admin)
    canViewOrders:          hasPermission(PERMISSIONS.ORDERS_VIEW),
    canManageOrders:        hasPermission(PERMISSIONS.ORDERS_MANAGE),

    // Billing (admin)
    canViewBilling:         hasPermission(PERMISSIONS.BILLING_VIEW),
    canManageBilling:       hasPermission(PERMISSIONS.BILLING_MANAGE),

    // Backups
    canViewBackups:         hasPermission(PERMISSIONS.BACKUPS_VIEW),
    canManageBackups:       hasPermission(PERMISSIONS.BACKUPS_MANAGE),

    // Automation
    canViewAutomation:      hasPermission(PERMISSIONS.AUTOMATION_VIEW),
    canManageAutomation:    hasPermission(PERMISSIONS.AUTOMATION_MANAGE),

    // Security
    canViewImpersonationLogs: hasPermission(PERMISSIONS.IMPERSONATION_LOGS_VIEW),
    canViewIpRules:         hasPermission(PERMISSIONS.IP_RULES_VIEW),
    canManageIpRules:       hasPermission(PERMISSIONS.IP_RULES_MANAGE),
    canViewAuditLogs:       hasPermission(PERMISSIONS.AUDIT_LOGS_VIEW),
    canViewSessions:        hasPermission(PERMISSIONS.SESSIONS_VIEW),
    canManageSessions:      hasPermission(PERMISSIONS.SESSIONS_MANAGE),

    // Plugins
    canManagePlugins:       hasPermission(PERMISSIONS.PLUGINS_MANAGE),
    canUploadPlugins:       hasPermission(PERMISSIONS.PLUGINS_UPLOAD),
    canUpdatePlugins:       hasPermission(PERMISSIONS.PLUGINS_UPDATE),

    // Developer portal
    canAccessDeveloperPortal: hasPermission(PERMISSIONS.DEVELOPER_ACCESS),

    // Superadmin-only actions
    canApprovePlugins:      user?.roles?.includes("superadmin") ?? false,

    // Role helpers
    isSuperAdmin:           user?.roles?.includes("superadmin") ?? false,
    isAdmin:                user?.roles?.some(r => ["superadmin","admin"].includes(r)) ?? false,
    isDeveloper:            user?.roles?.includes("developer") ?? false,
  };
}
