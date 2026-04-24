// src/modules/auth/services/user.service.js
const prisma = require("../../../../prisma/index");
const AuditService = require("./audit.service");
const ImpersonationService = require("./impersonation.service");

const UserService = {
  /**
   * List users with pagination, search and basic filters.
   * q: search by email or id
   * page, limit: pagination
   * role: filter by role name
   * status: active/inactive
   */
  async listUsers({ q, page = 1, limit = 20, role, status } = {}) {
    const where = {};

    if (q) {
      where.OR = [{ email: { contains: q } }, { id: { contains: q } }];
    }

    if (status === "inactive") where.disabled = true;
    if (status === "active") where.disabled = false;

    // If role filter requested -- join via userRole
    if (role) {
      where.roles = {
        some: {
          role: { name: role }
        }
      };
    }

    const take = Math.min(100, Number(limit || 20));
    const skip = (Number(page || 1) - 1) * take;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          roles: { include: { role: true } },
          clientProfile: true,
          adminProfile: true,
          resellerProfile: true,
          developerProfile: true
        }
      })
    ]);

    const mapped = users.map(u => ({
      id: u.id,
      email: u.email,
      emailVerified: Boolean(u.emailVerified),
      disabled: Boolean(u.disabled),
      roles: (u.roles || []).map(r => r.role && r.role.name).filter(Boolean),
      createdAt: u.createdAt,
      lastLogin: u.lastLogin || null,
      profileSummary: {
        client: !!u.clientProfile,
        admin: !!u.adminProfile,
        reseller: !!u.resellerProfile,
        developer: !!u.developerProfile
      }
    }));

    return { total, page: Number(page), limit: take, users: mapped };
  },

  /**
   * Get full user with relationships
   */
  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        clientProfile: true,
        adminProfile: true,
        resellerProfile: true,
        developerProfile: true,
        sessions: true
      }
    });
    return user;
  },

  /**
   * Replace roles for a user (idempotent). Accepts array of role names.
   */
  async updateRoles(userId, roleNames = [], actorId = null) {
    // load roles
    const roles = await prisma.role.findMany({ where: { name: { in: roleNames } } });
    // remove existing userRole links then create
    await prisma.userRole.deleteMany({ where: { userId } });
    const ops = roles.map(r => prisma.userRole.create({ data: { userId, roleId: r.id } }));
    await Promise.all(ops);

    await AuditService.log({
      userId: actorId,
      action: "admin.update_user_roles",
      entity: "user",
      entityId: userId,
      data: { roles: roleNames }
    });

    return { success: true, roles: roleNames };
  },

  /**
   * Deactivate (disable) a user account.
   */
  async deactivateUser(userId, actorId = null, reason = null) {
    await prisma.user.update({ where: { id: userId }, data: { disabled: true } });

    // delete sessions
    await prisma.session.deleteMany({ where: { userId } });

    await AuditService.log({
      userId: actorId,
      action: "admin.deactivate_user",
      entity: "user",
      entityId: userId,
      data: { reason }
    });

    return { success: true };
  },

  /**
   * Force logout user: delete all sessions for user
   */
  async forceLogout(userId, actorId = null) {
    await prisma.session.deleteMany({ where: { userId } });

    await AuditService.log({
      userId: actorId,
      action: "admin.force_logout_user",
      entity: "user",
      entityId: userId
    });

    return { success: true };
  },

  /**
   * Optional: Start impersonation as admin for a target user using existing service.
   * This returns whichever payload ImpersonationService.startImpersonation returns.
   */
  async impersonateAs({ adminUser, targetUserId, ip, userAgent, reason }) {
    const result = await ImpersonationService.startImpersonation({
      adminUser,
      targetUserId,
      ip,
      userAgent,
      reason
    });

    await AuditService.log({
      userId: adminUser.id,
      action: "admin.impersonate.start",
      entity: "user",
      entityId: targetUserId,
      data: { reason }
    });

    return result;
  }
};

module.exports = UserService;
