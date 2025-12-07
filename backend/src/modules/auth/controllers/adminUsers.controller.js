// src/modules/auth/controllers/adminUsers.controller.js
const UserService = require("../services/user.service");

class AdminUsersController {
  static async list(req, res) {
    try {
      const { q, page, limit, role, status } = req.query;
      const result = await UserService.listUsers({ q, page, limit, role, status });
      return res.json(result);
    } catch (err) {
      console.error("ADMIN LIST USERS ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async get(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ user });
    } catch (err) {
      console.error("ADMIN GET USER ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async updateRoles(req, res) {
    try {
      const { id } = req.params;
      const { roles } = req.body;
      if (!Array.isArray(roles)) return res.status(400).json({ error: "roles must be array" });
      const result = await UserService.updateRoles(id, roles, req.user.id);
      return res.json(result);
    } catch (err) {
      console.error("ADMIN UPDATE ROLES ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async deactivate(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await UserService.deactivateUser(id, req.user.id, reason);
      return res.json(result);
    } catch (err) {
      console.error("ADMIN DEACTIVATE USER ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async forceLogout(req, res) {
    try {
      const { id } = req.params;
      const result = await UserService.forceLogout(id, req.user.id);
      return res.json(result);
    } catch (err) {
      console.error("ADMIN FORCE LOGOUT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async impersonate(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const ip = req.ip;
      const userAgent = req.headers["user-agent"];
      const result = await UserService.impersonateAs({
        adminUser: req.user,
        targetUserId: id,
        ip, userAgent, reason
      });
      return res.json({ success: true, ...result });
    } catch (err) {
      console.error("ADMIN IMPERSONATE ERROR:", err);
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = AdminUsersController;
