// src/modules/auth/controllers/rbacAdmin.controller.js
//
// RBAC management for superadmins.
// System permissions are defined HERE in code — no seed files or JSON files.
// The bootstrap endpoint creates any missing DB records from this definition.

const prisma = require("../../../../prisma/index");

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PERMISSION DEFINITION
// This is the single source of truth. Superadmin manages role↔permission
// links via the UI; these records just need to exist in the DB first.
// Run POST /api/admin/rbac/bootstrap to sync any missing ones.
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PERMISSIONS = [
  // Admin portal
  { key: "admin.access",              description: "Access admin portal",                     module: "Admin Portal" },
  { key: "admin.manage.staff",        description: "Manage admin staff accounts",              module: "Admin Portal" },
  { key: "admin.settings.update",     description: "Update system settings",                   module: "Admin Portal" },

  // Users
  { key: "users.view",                description: "View user list",                           module: "Users" },
  { key: "users.deactivate",          description: "Activate or deactivate users",             module: "Users" },
  { key: "users.roles.assign",        description: "Assign or change user roles",              module: "Users" },
  { key: "users.impersonate",         description: "Impersonate another user",                 module: "Users" },
  { key: "users.logout.force",        description: "Force logout any user",                    module: "Users" },

  // Roles
  { key: "roles.view",                description: "View roles and their permissions",         module: "Roles" },
  { key: "roles.permissions.assign",  description: "Assign or remove permissions from roles",  module: "Roles" },

  // Services
  { key: "services.view",             description: "View service catalog",                     module: "Services" },
  { key: "services.manage",           description: "Create, edit and delete services",         module: "Services" },

  // Orders (admin)
  { key: "orders.view",               description: "View all orders",                          module: "Orders" },
  { key: "orders.manage",             description: "Manage orders",                            module: "Orders" },

  // Billing (admin)
  { key: "billing.view",              description: "View billing overview",                    module: "Billing" },
  { key: "billing.manage",            description: "Manage billing",                           module: "Billing" },

  // Backups
  { key: "backups.view",              description: "View backups",                             module: "Backups" },
  { key: "backups.manage",            description: "Create and manage backups",                module: "Backups" },

  // Automation & Workflows
  { key: "automation.view",           description: "View automation rules and workflows",      module: "Automation" },
  { key: "automation.manage",         description: "Create and manage automation",             module: "Automation" },

  // Security
  { key: "impersonation.logs.view",   description: "View impersonation session logs",          module: "Security" },
  { key: "ip_rules.view",             description: "View IP access rules",                     module: "Security" },
  { key: "ip_rules.manage",           description: "Create, edit and delete IP rules",         module: "Security" },
  { key: "audit.logs.view",           description: "View audit logs",                          module: "Security" },
  { key: "sessions.view",             description: "View active user sessions",                module: "Security" },
  { key: "sessions.manage",           description: "Terminate user sessions",                  module: "Security" },

  // Plugins
  { key: "plugins.manage",            description: "Manage installed plugins (admin)",         module: "Plugins" },
  { key: "plugins.upload",            description: "Upload new plugins",                       module: "Plugins" },
  { key: "plugins.update",            description: "Update existing plugin versions",          module: "Plugins" },

  // Client portal
  { key: "client.area.access",        description: "Access client portal",                     module: "Client Portal" },
  { key: "billing.invoices.view",     description: "View own invoices",                        module: "Client Portal" },
  { key: "billing.invoices.pay",      description: "Pay invoices",                             module: "Client Portal" },
  { key: "orders.create",             description: "Create a new order",                       module: "Client Portal" },
  { key: "orders.read",               description: "View own orders",                          module: "Client Portal" },
  { key: "orders.cancel",             description: "Cancel pending orders",                    module: "Client Portal" },
  { key: "orders.renew",              description: "Renew active orders",                      module: "Client Portal" },

  // Reseller portal
  { key: "reseller.dashboard.access", description: "Access reseller portal",                   module: "Reseller" },

  // Developer portal
  { key: "developer.console.access",  description: "Access developer console",                 module: "Developer" },
];

// Group by module for the UI
function groupedPermissions() {
  const groups = {};
  for (const p of SYSTEM_PERMISSIONS) {
    if (!groups[p.module]) groups[p.module] = [];
    groups[p.module].push({ key: p.key, description: p.description });
  }
  return groups;
}

class RbacAdminController {
  // ─────────────────────────────────────────────────────────────────────
  // POST /api/admin/rbac/bootstrap
  // Upsert all system permission records into the DB.
  // Safe to call multiple times. No seed file needed.
  // Accessible by superadmin AND admin (in case first-time setup).
  // ─────────────────────────────────────────────────────────────────────
  static async bootstrap(req, res) {
    try {
      let created = 0;

      for (const p of SYSTEM_PERMISSIONS) {
        const result = await prisma.permission.upsert({
          where: { key: p.key },
          update: { description: p.description },
          create: { key: p.key, description: p.description },
        });
        if (!result.createdAt || result.createdAt > new Date(Date.now() - 2000)) {
          created++;
        }
      }

      return res.json({
        success: true,
        total: SYSTEM_PERMISSIONS.length,
        message: `System permissions synced (${SYSTEM_PERMISSIONS.length} total)`,
      });
    } catch (err) {
      console.error("RBAC BOOTSTRAP ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/admin/rbac/roles
  // All roles with their current permission assignments
  // ─────────────────────────────────────────────────────────────────────
  static async listRoles(req, res) {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { userRoles: true } },
        },
        orderBy: { name: "asc" },
      });

      return res.json({
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          userCount: r._count.userRoles,
          permissions: r.permissions.map((rp) => rp.permission.key),
        })),
      });
    } catch (err) {
      console.error("RBAC LIST ROLES ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/admin/rbac/permissions
  // All system permissions grouped by module (from code definition, not DB)
  // ─────────────────────────────────────────────────────────────────────
  static async listPermissions(req, res) {
    try {
      return res.json({
        permissions: SYSTEM_PERMISSIONS,
        grouped: groupedPermissions(),
      });
    } catch (err) {
      console.error("RBAC LIST PERMISSIONS ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // PUT /api/admin/rbac/roles/:roleId/permissions
  // Replace the FULL permission set for a role (superadmin only)
  // Body: { permissions: ["key1", "key2"] }
  // ─────────────────────────────────────────────────────────────────────
  static async setRolePermissions(req, res) {
    try {
      const { roleId } = req.params;
      const { permissions: permKeys } = req.body;

      if (!Array.isArray(permKeys)) {
        return res.status(400).json({ error: "permissions must be an array of permission keys" });
      }

      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) return res.status(404).json({ error: "Role not found" });

      // Validate all keys are known system permissions
      const validKeys = new Set(SYSTEM_PERMISSIONS.map((p) => p.key));
      const unknown = permKeys.filter((k) => !validKeys.has(k));
      if (unknown.length > 0) {
        return res.status(400).json({ error: "Unknown permission keys", unknown });
      }

      // Resolve permission IDs from DB (bootstrap must be called first)
      const perms = await prisma.permission.findMany({
        where: { key: { in: permKeys } },
      });

      const foundKeys = new Set(perms.map((p) => p.key));
      const missing = permKeys.filter((k) => !foundKeys.has(k));
      if (missing.length > 0) {
        return res.status(400).json({
          error: "Some permissions are not in the database yet. Call POST /api/admin/rbac/bootstrap first.",
          missing,
        });
      }

      // Atomic replace
      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId } }),
        prisma.rolePermission.createMany({
          data: perms.map((p) => ({ roleId, permissionId: p.id })),
          skipDuplicates: true,
        }),
      ]);

      const AuditService = require("../services/audit.service");
      await AuditService.log({
        userId: req.user.id,
        action: "admin.rbac.set_role_permissions",
        entity: "role",
        entityId: roleId,
        metadata: { roleName: role.name, permissions: permKeys },
      });

      return res.json({ success: true, role: role.name, permissions: permKeys });
    } catch (err) {
      console.error("RBAC SET ROLE PERMISSIONS ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/admin/rbac/roles/:roleId/permissions/:permissionKey
  // Add a single permission to a role
  // ─────────────────────────────────────────────────────────────────────
  static async addPermissionToRole(req, res) {
    try {
      const { roleId, permissionKey } = req.params;

      const validKeys = new Set(SYSTEM_PERMISSIONS.map((p) => p.key));
      if (!validKeys.has(permissionKey)) {
        return res.status(400).json({ error: `Unknown permission: ${permissionKey}` });
      }

      const [role, perm] = await Promise.all([
        prisma.role.findUnique({ where: { id: roleId } }),
        prisma.permission.findUnique({ where: { key: permissionKey } }),
      ]);

      if (!role) return res.status(404).json({ error: "Role not found" });
      if (!perm) return res.status(404).json({ error: "Permission not in DB — call /bootstrap first" });

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: perm.id } },
        update: {},
        create: { roleId, permissionId: perm.id },
      });

      const AuditService = require("../services/audit.service");
      await AuditService.log({
        userId: req.user.id,
        action: "admin.rbac.add_permission",
        entity: "role",
        entityId: roleId,
        metadata: { roleName: role.name, permission: permissionKey },
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("RBAC ADD PERMISSION ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // DELETE /api/admin/rbac/roles/:roleId/permissions/:permissionKey
  // Remove a single permission from a role
  // ─────────────────────────────────────────────────────────────────────
  static async removePermissionFromRole(req, res) {
    try {
      const { roleId, permissionKey } = req.params;

      const [role, perm] = await Promise.all([
        prisma.role.findUnique({ where: { id: roleId } }),
        prisma.permission.findUnique({ where: { key: permissionKey } }),
      ]);

      if (!role) return res.status(404).json({ error: "Role not found" });
      if (!perm) return res.status(404).json({ error: "Permission not found" });

      await prisma.rolePermission.deleteMany({
        where: { roleId, permissionId: perm.id },
      });

      const AuditService = require("../services/audit.service");
      await AuditService.log({
        userId: req.user.id,
        action: "admin.rbac.remove_permission",
        entity: "role",
        entityId: roleId,
        metadata: { roleName: role.name, permission: permissionKey },
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("RBAC REMOVE PERMISSION ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = RbacAdminController;
