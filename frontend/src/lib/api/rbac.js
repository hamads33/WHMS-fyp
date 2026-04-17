// lib/api/rbac.js
// Paths are relative to NEXT_PUBLIC_API_URL (which already includes /api)

import { apiFetch } from "./client";

export const RbacAPI = {
  /** Sync all system permission records into the DB (safe to call multiple times) */
  bootstrap: () =>
    apiFetch("/admin/rbac/bootstrap", { method: "POST" }),

  /** List all roles with their current permission keys */
  listRoles: () =>
    apiFetch("/admin/rbac/roles"),

  /** List all system permissions grouped by module */
  listPermissions: () =>
    apiFetch("/admin/rbac/permissions"),

  /**
   * Replace the full permission set for a role (superadmin only).
   * @param {string} roleId
   * @param {string[]} permissionKeys
   */
  setRolePermissions: (roleId, permissionKeys) =>
    apiFetch(`/admin/rbac/roles/${roleId}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions: permissionKeys }),
    }),

  /**
   * Toggle a single permission on a role (superadmin only).
   * @param {string} roleId
   * @param {string} permissionKey
   * @param {boolean} grant  true = add, false = remove
   */
  togglePermission: (roleId, permissionKey, grant) =>
    apiFetch(`/admin/rbac/roles/${roleId}/permissions/${encodeURIComponent(permissionKey)}`, {
      method: grant ? "POST" : "DELETE",
    }),
};
