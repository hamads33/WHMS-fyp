// lib/constants/permissions.js
// Keys MUST match backend src/modules/auth/rbac/permissions.json exactly.

export const PERMISSIONS = {
  // ── Admin portal ─────────────────────────────────────────
  ADMIN_ACCESS:               "admin.access",
  ADMIN_MANAGE_STAFF:         "admin.manage.staff",
  ADMIN_SETTINGS:             "admin.settings.update",

  // ── Users module ─────────────────────────────────────────
  USERS_VIEW:                 "users.view",
  USERS_DEACTIVATE:           "users.deactivate",
  USERS_ROLES_ASSIGN:         "users.roles.assign",
  USERS_IMPERSONATE:          "users.impersonate",
  USERS_LOGOUT_FORCE:         "users.logout.force",

  // ── Roles & permissions module ───────────────────────────
  ROLES_VIEW:                 "roles.view",
  ROLES_PERMISSIONS_ASSIGN:   "roles.permissions.assign",

  // ── Services module ──────────────────────────────────────
  SERVICES_VIEW:              "services.view",
  SERVICES_MANAGE:            "services.manage",

  // ── Orders module (admin) ────────────────────────────────
  ORDERS_VIEW:                "orders.view",
  ORDERS_MANAGE:              "orders.manage",

  // ── Billing module (admin) ───────────────────────────────
  BILLING_VIEW:               "billing.view",
  BILLING_MANAGE:             "billing.manage",

  // ── Backups module ───────────────────────────────────────
  BACKUPS_VIEW:               "backups.view",
  BACKUPS_MANAGE:             "backups.manage",

  // ── Automation / Workflows ───────────────────────────────
  AUTOMATION_VIEW:            "automation.view",
  AUTOMATION_MANAGE:          "automation.manage",

  // ── Impersonation logs ───────────────────────────────────
  IMPERSONATION_LOGS_VIEW:    "impersonation.logs.view",

  // ── IP Rules ─────────────────────────────────────────────
  IP_RULES_VIEW:              "ip_rules.view",
  IP_RULES_MANAGE:            "ip_rules.manage",

  // ── Audit Logs ───────────────────────────────────────────
  AUDIT_LOGS_VIEW:            "audit.logs.view",

  // ── Plugins ──────────────────────────────────────────────
  PLUGINS_MANAGE:             "plugins.manage",
  PLUGINS_UPLOAD:             "plugins.upload",
  PLUGINS_UPDATE:             "plugins.update",

  // ── Sessions ─────────────────────────────────────────────
  SESSIONS_VIEW:              "sessions.view",
  SESSIONS_MANAGE:            "sessions.manage",

  // ── Client portal ────────────────────────────────────────
  CLIENT_ACCESS:              "client.area.access",
  CLIENT_BILLING_VIEW:        "billing.invoices.view",
  CLIENT_BILLING_PAY:         "billing.invoices.pay",
  CLIENT_ORDERS_CREATE:       "orders.create",
  CLIENT_ORDERS_READ:         "orders.read",
  CLIENT_ORDERS_CANCEL:       "orders.cancel",
  CLIENT_ORDERS_RENEW:        "orders.renew",

  // ── Reseller portal ──────────────────────────────────────
  RESELLER_ACCESS:            "reseller.dashboard.access",

  // ── Developer portal ─────────────────────────────────────
  DEVELOPER_ACCESS:           "developer.console.access",
};

/** Human-readable labels for each permission key */
export const PERMISSION_LABELS = {
  [PERMISSIONS.ADMIN_ACCESS]:             "Access Admin Portal",
  [PERMISSIONS.ADMIN_MANAGE_STAFF]:       "Manage Staff Accounts",
  [PERMISSIONS.ADMIN_SETTINGS]:           "Update System Settings",

  [PERMISSIONS.USERS_VIEW]:              "View Users",
  [PERMISSIONS.USERS_DEACTIVATE]:        "Activate / Deactivate Users",
  [PERMISSIONS.USERS_ROLES_ASSIGN]:      "Assign User Roles",
  [PERMISSIONS.USERS_IMPERSONATE]:       "Impersonate Users",
  [PERMISSIONS.USERS_LOGOUT_FORCE]:      "Force Logout Users",

  [PERMISSIONS.ROLES_VIEW]:              "View Roles & Permissions",
  [PERMISSIONS.ROLES_PERMISSIONS_ASSIGN]:"Assign Permissions to Roles",

  [PERMISSIONS.SERVICES_VIEW]:           "View Services",
  [PERMISSIONS.SERVICES_MANAGE]:         "Manage Services",

  [PERMISSIONS.ORDERS_VIEW]:             "View All Orders",
  [PERMISSIONS.ORDERS_MANAGE]:           "Manage Orders",

  [PERMISSIONS.BILLING_VIEW]:            "View Billing Overview",
  [PERMISSIONS.BILLING_MANAGE]:          "Manage Billing",

  [PERMISSIONS.BACKUPS_VIEW]:            "View Backups",
  [PERMISSIONS.BACKUPS_MANAGE]:          "Manage Backups",

  [PERMISSIONS.AUTOMATION_VIEW]:         "View Automation & Workflows",
  [PERMISSIONS.AUTOMATION_MANAGE]:       "Manage Automation & Workflows",

  [PERMISSIONS.IMPERSONATION_LOGS_VIEW]: "View Impersonation Logs",

  [PERMISSIONS.IP_RULES_VIEW]:           "View IP Rules",
  [PERMISSIONS.IP_RULES_MANAGE]:         "Manage IP Rules",

  [PERMISSIONS.AUDIT_LOGS_VIEW]:         "View Audit Logs",

  [PERMISSIONS.PLUGINS_MANAGE]:          "Manage Plugins (Admin)",
  [PERMISSIONS.PLUGINS_UPLOAD]:          "Upload Plugins",
  [PERMISSIONS.PLUGINS_UPDATE]:          "Update Plugins",

  [PERMISSIONS.SESSIONS_VIEW]:           "View Active Sessions",
  [PERMISSIONS.SESSIONS_MANAGE]:         "Terminate Sessions",

  [PERMISSIONS.CLIENT_ACCESS]:           "Access Client Portal",
  [PERMISSIONS.CLIENT_BILLING_VIEW]:     "View Invoices",
  [PERMISSIONS.CLIENT_BILLING_PAY]:      "Pay Invoices",
  [PERMISSIONS.CLIENT_ORDERS_CREATE]:    "Create Orders",
  [PERMISSIONS.CLIENT_ORDERS_READ]:      "View Own Orders",
  [PERMISSIONS.CLIENT_ORDERS_CANCEL]:    "Cancel Orders",
  [PERMISSIONS.CLIENT_ORDERS_RENEW]:     "Renew Orders",

  [PERMISSIONS.RESELLER_ACCESS]:         "Access Reseller Portal",
  [PERMISSIONS.DEVELOPER_ACCESS]:        "Access Developer Console",
};

/** Grouped permissions for the RBAC management UI */
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
      PERMISSIONS.USERS_DEACTIVATE,
      PERMISSIONS.USERS_ROLES_ASSIGN,
      PERMISSIONS.USERS_IMPERSONATE,
      PERMISSIONS.USERS_LOGOUT_FORCE,
    ],
  },
  roles: {
    label: "Roles & Permissions",
    permissions: [
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.ROLES_PERMISSIONS_ASSIGN,
    ],
  },
  services: {
    label: "Services",
    permissions: [PERMISSIONS.SERVICES_VIEW, PERMISSIONS.SERVICES_MANAGE],
  },
  orders: {
    label: "Orders (Admin)",
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE],
  },
  billing: {
    label: "Billing (Admin)",
    permissions: [PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_MANAGE],
  },
  backups: {
    label: "Backups",
    permissions: [PERMISSIONS.BACKUPS_VIEW, PERMISSIONS.BACKUPS_MANAGE],
  },
  automation: {
    label: "Automation & Workflows",
    permissions: [PERMISSIONS.AUTOMATION_VIEW, PERMISSIONS.AUTOMATION_MANAGE],
  },
  security: {
    label: "Security",
    permissions: [
      PERMISSIONS.IMPERSONATION_LOGS_VIEW,
      PERMISSIONS.IP_RULES_VIEW,
      PERMISSIONS.IP_RULES_MANAGE,
      PERMISSIONS.AUDIT_LOGS_VIEW,
      PERMISSIONS.SESSIONS_VIEW,
      PERMISSIONS.SESSIONS_MANAGE,
    ],
  },
  plugins: {
    label: "Plugins",
    permissions: [
      PERMISSIONS.PLUGINS_MANAGE,
      PERMISSIONS.PLUGINS_UPLOAD,
      PERMISSIONS.PLUGINS_UPDATE,
    ],
  },
  client: {
    label: "Client Portal",
    permissions: [
      PERMISSIONS.CLIENT_ACCESS,
      PERMISSIONS.CLIENT_BILLING_VIEW,
      PERMISSIONS.CLIENT_BILLING_PAY,
      PERMISSIONS.CLIENT_ORDERS_CREATE,
      PERMISSIONS.CLIENT_ORDERS_READ,
      PERMISSIONS.CLIENT_ORDERS_CANCEL,
      PERMISSIONS.CLIENT_ORDERS_RENEW,
    ],
  },
  reseller: {
    label: "Reseller Portal",
    permissions: [PERMISSIONS.RESELLER_ACCESS],
  },
  developer: {
    label: "Developer Portal",
    permissions: [
      PERMISSIONS.DEVELOPER_ACCESS,
      PERMISSIONS.PLUGINS_UPLOAD,
      PERMISSIONS.PLUGINS_UPDATE,
    ],
  },
};
