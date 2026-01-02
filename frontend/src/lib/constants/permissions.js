// lib/constants/permissions.js

/**
 * System Permissions
 */
export const PERMISSIONS = {
  // Admin Portal
  ADMIN_ACCESS: "admin.access",
  ADMIN_MANAGE_STAFF: "admin.manage.staff",
  ADMIN_SETTINGS: "admin.settings.update",
  
  // User Management
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  USERS_MANAGE_ROLES: "users.manage.roles",
  
  // Roles & Permissions
  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",
  ROLES_DELETE: "roles.delete",
  PERMISSIONS_MANAGE: "permissions.manage",
  
  // Impersonation
  IMPERSONATION_START: "impersonation.start",
  IMPERSONATION_STOP: "impersonation.stop",
  IMPERSONATION_VIEW: "impersonation.list",
  
  // IP Rules
  IP_RULES_VIEW: "ip_rules.view",
  IP_RULES_CREATE: "ip_rules.create",
  IP_RULES_EDIT: "ip_rules.edit",
  IP_RULES_DELETE: "ip_rules.delete",
  
  // Audit Logs
  AUDIT_LOGS_VIEW: "audit.logs.view",
  AUDIT_LOGS_EXPORT: "audit.logs.export",
  
  // API Keys
  API_KEYS_CREATE: "api_keys.create",
  API_KEYS_VIEW: "api_keys.view",
  API_KEYS_REVOKE: "api_keys.revoke",
  
  // Client Portal
  CLIENT_ACCESS: "client.area.access",
  CLIENT_BILLING_VIEW: "billing.invoices.view",
  CLIENT_BILLING_PAY: "billing.invoices.pay",
  CLIENT_SUPPORT: "support.tickets.create",
  
  // Reseller Portal
  RESELLER_ACCESS: "reseller.dashboard.access",
  RESELLER_MANAGE_CLIENTS: "reseller.clients.manage",
  RESELLER_VIEW_REVENUE: "reseller.revenue.view",
  
  // Developer Portal
  DEVELOPER_ACCESS: "developer.console.access",
  DEVELOPER_PLUGINS_UPLOAD: "plugins.upload",
  DEVELOPER_PLUGINS_UPDATE: "plugins.update",
  DEVELOPER_PLUGINS_DELETE: "plugins.delete",
};

/**
 * Permission Display Names
 */
export const PERMISSION_LABELS = {
  [PERMISSIONS.ADMIN_ACCESS]: "Access Admin Portal",
  [PERMISSIONS.ADMIN_MANAGE_STAFF]: "Manage Staff Accounts",
  [PERMISSIONS.ADMIN_SETTINGS]: "Update System Settings",
  
  [PERMISSIONS.USERS_VIEW]: "View Users",
  [PERMISSIONS.USERS_CREATE]: "Create Users",
  [PERMISSIONS.USERS_EDIT]: "Edit Users",
  [PERMISSIONS.USERS_DELETE]: "Delete Users",
  [PERMISSIONS.USERS_MANAGE_ROLES]: "Manage User Roles",
  
  [PERMISSIONS.ROLES_VIEW]: "View Roles",
  [PERMISSIONS.ROLES_CREATE]: "Create Roles",
  [PERMISSIONS.ROLES_EDIT]: "Edit Roles",
  [PERMISSIONS.ROLES_DELETE]: "Delete Roles",
  [PERMISSIONS.PERMISSIONS_MANAGE]: "Manage Permissions",
  
  [PERMISSIONS.IMPERSONATION_START]: "Start Impersonation",
  [PERMISSIONS.IMPERSONATION_STOP]: "Stop Impersonation",
  [PERMISSIONS.IMPERSONATION_VIEW]: "View Impersonation Sessions",
  
  [PERMISSIONS.IP_RULES_VIEW]: "View IP Rules",
  [PERMISSIONS.IP_RULES_CREATE]: "Create IP Rules",
  [PERMISSIONS.IP_RULES_EDIT]: "Edit IP Rules",
  [PERMISSIONS.IP_RULES_DELETE]: "Delete IP Rules",
  
  [PERMISSIONS.AUDIT_LOGS_VIEW]: "View Audit Logs",
  [PERMISSIONS.AUDIT_LOGS_EXPORT]: "Export Audit Logs",
  
  [PERMISSIONS.API_KEYS_CREATE]: "Create API Keys",
  [PERMISSIONS.API_KEYS_VIEW]: "View API Keys",
  [PERMISSIONS.API_KEYS_REVOKE]: "Revoke API Keys",
  
  [PERMISSIONS.CLIENT_ACCESS]: "Access Client Portal",
  [PERMISSIONS.CLIENT_BILLING_VIEW]: "View Invoices",
  [PERMISSIONS.CLIENT_BILLING_PAY]: "Pay Invoices",
  [PERMISSIONS.CLIENT_SUPPORT]: "Create Support Tickets",
  
  [PERMISSIONS.RESELLER_ACCESS]: "Access Reseller Portal",
  [PERMISSIONS.RESELLER_MANAGE_CLIENTS]: "Manage Clients",
  [PERMISSIONS.RESELLER_VIEW_REVENUE]: "View Revenue",
  
  [PERMISSIONS.DEVELOPER_ACCESS]: "Access Developer Console",
  [PERMISSIONS.DEVELOPER_PLUGINS_UPLOAD]: "Upload Plugins",
  [PERMISSIONS.DEVELOPER_PLUGINS_UPDATE]: "Update Plugins",
  [PERMISSIONS.DEVELOPER_PLUGINS_DELETE]: "Delete Plugins",
};

/**
 * Permission Groups (for UI organization)
 */
export const PERMISSION_GROUPS = {
  admin: {
    label: "Admin Portal",
    permissions: [
      PERMISSIONS.ADMIN_ACCESS,
      PERMISSIONS.ADMIN_MANAGE_STAFF,
      PERMISSIONS.ADMIN_SETTINGS,
    ],
  },
  users: {
    label: "User Management",
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.USERS_MANAGE_ROLES,
    ],
  },
  roles: {
    label: "Roles & Permissions",
    permissions: [
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.ROLES_CREATE,
      PERMISSIONS.ROLES_EDIT,
      PERMISSIONS.ROLES_DELETE,
      PERMISSIONS.PERMISSIONS_MANAGE,
    ],
  },
  impersonation: {
    label: "Impersonation",
    permissions: [
      PERMISSIONS.IMPERSONATION_START,
      PERMISSIONS.IMPERSONATION_STOP,
      PERMISSIONS.IMPERSONATION_VIEW,
    ],
  },
  security: {
    label: "Security",
    permissions: [
      PERMISSIONS.IP_RULES_VIEW,
      PERMISSIONS.IP_RULES_CREATE,
      PERMISSIONS.IP_RULES_EDIT,
      PERMISSIONS.IP_RULES_DELETE,
      PERMISSIONS.AUDIT_LOGS_VIEW,
      PERMISSIONS.AUDIT_LOGS_EXPORT,
    ],
  },
  api: {
    label: "API Access",
    permissions: [
      PERMISSIONS.API_KEYS_CREATE,
      PERMISSIONS.API_KEYS_VIEW,
      PERMISSIONS.API_KEYS_REVOKE,
    ],
  },
  client: {
    label: "Client Portal",
    permissions: [
      PERMISSIONS.CLIENT_ACCESS,
      PERMISSIONS.CLIENT_BILLING_VIEW,
      PERMISSIONS.CLIENT_BILLING_PAY,
      PERMISSIONS.CLIENT_SUPPORT,
    ],
  },
  reseller: {
    label: "Reseller Portal",
    permissions: [
      PERMISSIONS.RESELLER_ACCESS,
      PERMISSIONS.RESELLER_MANAGE_CLIENTS,
      PERMISSIONS.RESELLER_VIEW_REVENUE,
    ],
  },
  developer: {
    label: "Developer Portal",
    permissions: [
      PERMISSIONS.DEVELOPER_ACCESS,
      PERMISSIONS.DEVELOPER_PLUGINS_UPLOAD,
      PERMISSIONS.DEVELOPER_PLUGINS_UPDATE,
      PERMISSIONS.DEVELOPER_PLUGINS_DELETE,
    ],
  },
};