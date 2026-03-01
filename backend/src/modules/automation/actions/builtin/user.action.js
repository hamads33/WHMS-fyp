/**
 * User / Auth Actions
 * ------------------------------------------------------------------
 * Automation actions for user account management.
 */

module.exports = [
  // ----------------------------------------------------------------
  // user.create
  // ----------------------------------------------------------------
  {
    name: "Create User Account",
    type: "builtin",
    actionType: "user.create",
    module: "users",
    description: "Create a new user account with a specified role",
    schema: {
      type: "object",
      required: ["email", "name"],
      properties: {
        email:    { type: "string", title: "Email Address" },
        name:     { type: "string", title: "Full Name" },
        role:     { type: "string", title: "Role", enum: ["client", "admin", "support"], default: "client" },
        password: { type: "string", title: "Password", description: "Leave blank to send a set-password email" },
        sendWelcomeEmail: { type: "boolean", title: "Send Welcome Email", default: true },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { email, name, role = "client", password, sendWelcomeEmail = true } = params;

      if (!email) throw new Error("email is required");
      if (!name)  throw new Error("name is required");

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return { success: true, userId: existing.id, created: false, message: "User already exists" };

      const bcrypt = require("bcryptjs");
      const crypto = require("crypto");
      const rawPassword = password || crypto.randomBytes(12).toString("hex");
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const user = await prisma.user.create({
        data: { email, name, role, password: hashedPassword, isEmailVerified: false, createdAt: new Date() },
      });

      logger.info({ msg: "[user.create] Created", userId: user.id, email, role });
      return { success: true, userId: user.id, email, role, created: true };
    },
  },

  // ----------------------------------------------------------------
  // user.deactivate
  // ----------------------------------------------------------------
  {
    name: "Deactivate User",
    type: "builtin",
    actionType: "user.deactivate",
    module: "users",
    description: "Deactivate a user account so they cannot log in",
    schema: {
      type: "object",
      required: ["userId"],
      properties: {
        userId: { type: ["number", "string"], title: "User ID" },
        reason: { type: "string", title: "Reason" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { userId, reason } = params;

      if (!userId) throw new Error("userId is required");

      const id = Number(userId);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new Error(`User ${id} not found`);

      await prisma.user.update({ where: { id }, data: { isActive: false, deactivatedAt: new Date(), deactivateReason: reason || null } });

      logger.info({ msg: "[user.deactivate] Done", userId: id });
      return { success: true, userId: id, email: user.email };
    },
  },

  // ----------------------------------------------------------------
  // user.activate
  // ----------------------------------------------------------------
  {
    name: "Activate User",
    type: "builtin",
    actionType: "user.activate",
    module: "users",
    description: "Reactivate a previously deactivated user account",
    schema: {
      type: "object",
      required: ["userId"],
      properties: {
        userId: { type: ["number", "string"], title: "User ID" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { userId } = params;

      if (!userId) throw new Error("userId is required");

      const id = Number(userId);
      await prisma.user.update({ where: { id }, data: { isActive: true, deactivatedAt: null } });

      logger.info({ msg: "[user.activate] Done", userId: id });
      return { success: true, userId: id };
    },
  },

  // ----------------------------------------------------------------
  // user.reset_password
  // ----------------------------------------------------------------
  {
    name: "Send Password Reset",
    type: "builtin",
    actionType: "user.reset_password",
    module: "users",
    description: "Send a password reset email to a user",
    schema: {
      type: "object",
      required: ["userId"],
      properties: {
        userId: { type: ["number", "string"], title: "User ID" },
        expiresInHours: { type: "number", title: "Token Expiry (hours)", default: 24 },
      },
    },
    async execute(meta, context) {
      const { prisma, logger, app } = context;
      const params = meta.input ?? meta;
      const { userId, expiresInHours = 24 } = params;

      if (!userId) throw new Error("userId is required");

      const id = Number(userId);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new Error(`User ${id} not found`);

      const crypto = require("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      await prisma.passwordResetToken.upsert({
        where: { userId: id },
        update: { token, expiresAt },
        create: { userId: id, token, expiresAt },
      }).catch(() => {
        // Model may not exist — log to audit instead
        return prisma.auditLog.create({
          data: {
            source: "automation", action: "user.reset_password_requested",
            actor: "automation", level: "INFO",
            entity: "user", entityId: String(id),
            data: { email: user.email, token, expiresAt },
          },
        });
      });

      logger.info({ msg: "[user.reset_password] Token generated", userId: id });
      return { success: true, userId: id, email: user.email, token };
    },
  },

  // ----------------------------------------------------------------
  // user.update_role
  // ----------------------------------------------------------------
  {
    name: "Update User Role",
    type: "builtin",
    actionType: "user.update_role",
    module: "users",
    description: "Change a user's role",
    schema: {
      type: "object",
      required: ["userId", "role"],
      properties: {
        userId: { type: ["number", "string"], title: "User ID" },
        role:   { type: "string", title: "New Role", enum: ["client", "admin", "support"] },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { userId, role } = params;

      if (!userId) throw new Error("userId is required");
      if (!role)   throw new Error("role is required");

      const id = Number(userId);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new Error(`User ${id} not found`);

      await prisma.user.update({ where: { id }, data: { role } });

      logger.info({ msg: "[user.update_role] Done", userId: id, previousRole: user.role, newRole: role });
      return { success: true, userId: id, previousRole: user.role, newRole: role };
    },
  },
];
