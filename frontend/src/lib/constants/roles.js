// lib/constants/roles.js

/**
 * System Roles
 */
export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  STAFF: "staff",
  CLIENT: "client",
  RESELLER: "reseller",
  DEVELOPER: "developer",
};

/**
 * Role Display Names
 */
export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.STAFF]: "Staff",
  [ROLES.CLIENT]: "Client",
  [ROLES.RESELLER]: "Reseller",
  [ROLES.DEVELOPER]: "Developer",
};

/**
 * Role Descriptions
 */
export const ROLE_DESCRIPTIONS = {
  [ROLES.SUPERADMIN]: "Full unrestricted system access",
  [ROLES.ADMIN]: "Administrative access with some restrictions",
  [ROLES.STAFF]: "Support and billing agent access",
  [ROLES.CLIENT]: "Standard client portal access",
  [ROLES.RESELLER]: "Reseller portal with client management",
  [ROLES.DEVELOPER]: "Plugin marketplace developer access",
};

/**
 * Role Colors (for badges)
 */
export const ROLE_COLORS = {
  [ROLES.SUPERADMIN]: "destructive",
  [ROLES.ADMIN]: "default",
  [ROLES.STAFF]: "secondary",
  [ROLES.CLIENT]: "outline",
  [ROLES.RESELLER]: "default",
  [ROLES.DEVELOPER]: "secondary",
};

/**
 * Admin Roles (for quick checks)
 */
export const ADMIN_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.STAFF,
];

/**
 * Portal-specific Roles
 */
export const PORTAL_ROLES = {
  admin: ADMIN_ROLES,
  client: [ROLES.CLIENT],
  reseller: [ROLES.RESELLER],
  developer: [ROLES.DEVELOPER],
};