const prisma = require("../../../../prisma/index");

/**
 * RBAC Service
 *
 * Provides:
 *  - getUserRoles
 *  - getUserPermissions
 *  - assignRole
 *  - removeRole
 *  - hasPermission
 *  - ensureRole
 *  - ensurePermission
 *
 * Used by:
 *  - permissionGuard
 *  - admin user/role manager
 *  - automation module
 *  - plugin marketplace
 */

const RBACService = {

  ////////////////////////////////////////////////////////
  // Get full role list for a user
  ////////////////////////////////////////////////////////
  async getUserRoles(userId) {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true
      }
    });

    return userRoles.map(ur => ur.role.name);
  },

  ////////////////////////////////////////////////////////
  // Get ALL unique permissions for a given user
  ////////////////////////////////////////////////////////
  async getUserPermissions(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) return [];

    const permissions = [];

    (user.roles || []).forEach(ur => {
      ur.role?.permissions?.forEach(rp => {
        if (rp.permission?.key) permissions.push(rp.permission.key);
      });
    });

    return Array.from(new Set(permissions));
  },

  ////////////////////////////////////////////////////////
  // Assign role
  ////////////////////////////////////////////////////////
  async assignRole(userId, roleName) {
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) throw new Error(`Role "${roleName}" does not exist`);

    const exists = await prisma.userRole.findFirst({
      where: { userId, roleId: role.id }
    });

    if (exists) return true;

    await prisma.userRole.create({
      data: { userId, roleId: role.id }
    });

    return true;
  },

  ////////////////////////////////////////////////////////
  // Remove role
  ////////////////////////////////////////////////////////
  async removeRole(userId, roleName) {
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) throw new Error(`Role "${roleName}" does not exist`);

    await prisma.userRole.deleteMany({
      where: { userId, roleId: role.id }
    });

    return true;
  },

  ////////////////////////////////////////////////////////
  // Check if user has a specific permission
  ////////////////////////////////////////////////////////
  async hasPermission(userId, permissionKey) {
    const perms = await this.getUserPermissions(userId);
    return perms.includes(permissionKey);
  },

  ////////////////////////////////////////////////////////
  // Ensure a role exists (used by seeders & module loaders)
  ////////////////////////////////////////////////////////
  async ensureRole(roleName, description = "") {
    return prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName, description },
      update: { description }
    });
  },

  ////////////////////////////////////////////////////////
  // Ensure permission exists
  ////////////////////////////////////////////////////////
  async ensurePermission(key, description = "") {
    return prisma.permission.upsert({
      where: { key },
      create: { key, description },
      update: { description }
    });
  },

  ////////////////////////////////////////////////////////
  // Ensure role → permission mapping exists
  ////////////////////////////////////////////////////////
  async attachPermissionToRole(roleName, permissionKey) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    const perm = await prisma.permission.findUnique({ where: { key: permissionKey } });

    if (!role) throw new Error(`Role '${roleName}' does not exist`);
    if (!perm) throw new Error(`Permission '${permissionKey}' does not exist`);

    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: role.id, permissionId: perm.id }
    });

    if (exists) return true;

    await prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: perm.id
      }
    });

    return true;
  }
};

module.exports = RBACService;
