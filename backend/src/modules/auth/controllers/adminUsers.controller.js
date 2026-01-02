// src/modules/auth/controllers/adminUsers.controller.js

const UserService = require("../services/user.service");
const PasswordResetService = require("../services/passwordReset.service");
const AuthService = require("../services/auth.service");
const prisma = require("../../../../prisma/index");

class AdminUsersController {
  // --------------------------------------------------
  // LIST USERS
  // --------------------------------------------------
  static async list(req, res) {
    try {
      const { q, page, limit, role, status } = req.query;
      const result = await UserService.listUsers({
        q,
        page,
        limit,
        role,
        status,
      });
      return res.json(result);
    } catch (err) {
      console.error("ADMIN LIST USERS ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --------------------------------------------------
  // GET USER BY ID
  // --------------------------------------------------
  static async get(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({ user });
    } catch (err) {
      console.error("ADMIN GET USER ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --------------------------------------------------
  // UPDATE USER ROLES
  // --------------------------------------------------
  static async updateRoles(req, res) {
    try {
      const { id } = req.params;
      const { roles } = req.body;

      if (!Array.isArray(roles)) {
        return res.status(400).json({ error: "roles must be an array" });
      }

      // ✅ Prevent self-role modification
      if (id === req.user.id) {
        return res.status(403).json({ 
          error: "Cannot modify your own roles" 
        });
      }

      const result = await UserService.updateRoles(
        id,
        roles,
        req.user.id
      );

      return res.json(result);
    } catch (err) {
      console.error("ADMIN UPDATE ROLES ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --------------------------------------------------
  // DEACTIVATE USER
  // --------------------------------------------------
  static async deactivate(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // ✅ Prevent self-deactivation
      if (id === req.user.id) {
        return res.status(403).json({ 
          error: "Cannot deactivate your own account" 
        });
      }

      const result = await UserService.deactivateUser(
        id,
        req.user.id,
        reason
      );

      return res.json(result);
    } catch (err) {
      console.error("ADMIN DEACTIVATE USER ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --------------------------------------------------
  // ✅ NEW: ACTIVATE USER
  // --------------------------------------------------
  static async activate(req, res) {
    try {
      const { id } = req.params;

      await prisma.user.update({
        where: { id },
        data: { disabled: false },
      });

      const AuditService = require("../services/audit.service");
      await AuditService.log({
        userId: req.user.id,
        action: "admin.activate_user",
        entity: "user",
        entityId: id,
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("ADMIN ACTIVATE USER ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --------------------------------------------------
  // FORCE LOGOUT USER
  // --------------------------------------------------
  static async forceLogout(req, res) {
    try {
      const { id } = req.params;

      // ✅ Prevent self-force-logout
      if (id === req.user.id) {
        return res.status(403).json({ 
          error: "Cannot force logout yourself" 
        });
      }

      const result = await UserService.forceLogout(
        id,
        req.user.id
      );

      return res.json(result);
    } catch (err) {
      console.error("ADMIN FORCE LOGOUT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --------------------------------------------------
  // IMPERSONATE USER
  // --------------------------------------------------
  static async impersonate(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const ip = req.ip;
      const userAgent = req.headers["user-agent"];

      const result = await UserService.impersonateAs({
        adminUser: req.user,
        targetUserId: id,
        ip,
        userAgent,
        reason,
      });

      return res.json({ success: true, ...result });
    } catch (err) {
      console.error("ADMIN IMPERSONATE ERROR:", err);
      return res.status(400).json({ error: err.message });
    }
  }

  // --------------------------------------------------
  // ADMIN FORCE PASSWORD RESET
  // --------------------------------------------------
  static async forceResetPassword(req, res) {
    try {
      const admin = req.user;
      const { id: userId } = req.params;

      // RBAC check
      if (
        !admin.roles.includes("admin") &&
        !admin.roles.includes("superadmin")
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const user = await AuthService.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Admin-forced reset
      await PasswordResetService.requestReset(user.email);

      return res.json({ success: true });
    } catch (err) {
      console.error("ADMIN FORCE RESET ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // --------------------------------------------------
  // ✅ NEW: GET USER STATISTICS
  // --------------------------------------------------
  static async getStats(req, res) {
    try {
      const [total, active, disabled, byRole] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { disabled: false } }),
        prisma.user.count({ where: { disabled: true } }),
        prisma.role.findMany({
          include: {
            _count: {
              select: { userRoles: true },
            },
          },
        }),
      ]);

      return res.json({
        total,
        active,
        disabled,
        byRole: byRole.map((r) => ({
          role: r.name,
          count: r._count.userRoles,
        })),
      });
    } catch (err) {
      console.error("GET STATS ERROR:", err);
      return res.status(500).json({ error: "Failed to get stats" });
    }
  }

  // --------------------------------------------------
  // ✅ NEW: LIST ALL ROLES
  // --------------------------------------------------
  static async listRoles(req, res) {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              userRoles: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      const formatted = roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        userCount: role._count.userRoles,
        permissions: role.permissions.map((rp) => ({
          id: rp.permission.id,
          key: rp.permission.key,
          description: rp.permission.description,
        })),
      }));

      return res.json({ roles: formatted });
    } catch (err) {
      console.error("LIST ROLES ERROR:", err);
      return res.status(500).json({ error: "Failed to list roles" });
    }
  }
}

module.exports = AdminUsersController;