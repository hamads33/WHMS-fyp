// src/modules/clients/clients.controller.js
const prisma = require("../../../prisma/index");
const bcrypt = require("bcrypt");
const AuditService = require("../auth/services/audit.service");
const ImpersonationService = require("../auth/services/impersonation.service");
const PasswordResetService = require("../auth/services/passwordReset.service");

const SALT_ROUNDS = 12;

// RFC 5321 / RFC 5322 simplified email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Maximum field lengths enforced on every write
const FIELD_LIMITS = {
  email:    254,
  password: 128,
  company:  100,
  phone:     30,
  address:  255,
  country:    3,
  city:     100,
  postal:    20,
};

/**
 * Validate a client payload and return a map of field → message.
 * `requirePassword` controls whether the password field is checked.
 */
function validateClientFields(body, { requirePassword = false } = {}) {
  const { email, password, company, phone, address, country, city, postal } = body;
  const fields = {};

  if (email !== undefined) {
    if (!email) {
      fields.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      fields.email = "Must be a valid email address";
    } else if (email.length > FIELD_LIMITS.email) {
      fields.email = `Must be ${FIELD_LIMITS.email} characters or fewer`;
    }
  } else if (requirePassword) {
    fields.email = "Email is required";
  }

  if (requirePassword) {
    if (!password) {
      fields.password = "Password is required";
    } else if (password.length < 8) {
      fields.password = "Must be at least 8 characters";
    } else if (password.length > FIELD_LIMITS.password) {
      fields.password = `Must be ${FIELD_LIMITS.password} characters or fewer`;
    }
  }

  if (company  && company.length  > FIELD_LIMITS.company)  fields.company  = `Must be ${FIELD_LIMITS.company} characters or fewer`;
  if (phone    && phone.length    > FIELD_LIMITS.phone)    fields.phone    = `Must be ${FIELD_LIMITS.phone} characters or fewer`;
  if (address  && address.length  > FIELD_LIMITS.address)  fields.address  = `Must be ${FIELD_LIMITS.address} characters or fewer`;
  if (country  && country.length  > FIELD_LIMITS.country)  fields.country  = `Must be ${FIELD_LIMITS.country} characters or fewer`;
  if (city     && city.length     > FIELD_LIMITS.city)     fields.city     = `Must be ${FIELD_LIMITS.city} characters or fewer`;
  if (postal   && postal.length   > FIELD_LIMITS.postal)   fields.postal   = `Must be ${FIELD_LIMITS.postal} characters or fewer`;

  return fields;
}

const ClientsController = {
  // GET /api/admin/clients/stats
  async stats(req, res) {
    try {
      const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
      if (!clientRole) return res.json({ total: 0, active: 0, disabled: 0, verified: 0 });

      const [total, active, disabled, verified] = await Promise.all([
        prisma.userRole.count({ where: { roleId: clientRole.id } }),
        prisma.userRole.count({ where: { roleId: clientRole.id, user: { disabled: false } } }),
        prisma.userRole.count({ where: { roleId: clientRole.id, user: { disabled: true } } }),
        prisma.userRole.count({
          where: { roleId: clientRole.id, user: { emailVerified: true } },
        }),
      ]);

      return res.json({ total, active, disabled, verified });
    } catch (err) {
      console.error("CLIENT STATS ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  // GET /api/admin/clients
  async list(req, res) {
    try {
      const { q, page = 1, limit = 20, status } = req.query;

      const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
      if (!clientRole) return res.json({ total: 0, page: 1, limit: 20, users: [] });

      const where = { roles: { some: { roleId: clientRole.id } } };

      if (q) {
        where.OR = [
          { email: { contains: q, mode: "insensitive" } },
          { id: { contains: q } },
          { clientProfile: { company: { contains: q, mode: "insensitive" } } },
          { hostingAccounts: { some: { username: { contains: q, mode: "insensitive" } } } }
        ];
      }

      if (status === "active") where.disabled = false;
      if (status === "inactive") where.disabled = true;

      const take = Math.min(100, Number(limit));
      const skip = (Number(page) - 1) * take;

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            clientProfile: true,
            _count: { select: { orders: true } },
          },
        }),
      ]);

      const mapped = users.map((u) => ({
        id: u.id,
        email: u.email,
        emailVerified: Boolean(u.emailVerified),
        disabled: Boolean(u.disabled),
        createdAt: u.createdAt,
        lastLogin: u.lastLogin || null,
        orderCount: u._count.orders,
        profile: u.clientProfile
          ? {
              company: u.clientProfile.company,
              phone: u.clientProfile.phone,
              address: u.clientProfile.address,
              country: u.clientProfile.country,
              city: u.clientProfile.city,
              postal: u.clientProfile.postal,
            }
          : null,
      }));

      return res.json({ total, page: Number(page), limit: take, users: mapped });
    } catch (err) {
      console.error("CLIENT LIST ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  // GET /api/admin/clients/:id
  async get(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          clientProfile: true,
          roles: { include: { role: true } },
          sessions: { orderBy: { createdAt: "desc" }, take: 5 },
          orders: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { snapshot: true },
          },
        },
      });

      if (!user) return res.status(404).json({ error: "Client not found" });

      const isClient = user.roles.some((r) => r.role?.name === "client");
      if (!isClient) return res.status(400).json({ error: "User is not a client" });

      return res.json({
        id: user.id,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
        disabled: Boolean(user.disabled),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || null,
        profile: user.clientProfile || null,
        sessions: user.sessions,
        orders: user.orders.map((o) => ({
          id: o.id,
          status: o.status,
          createdAt: o.createdAt,
          service: o.snapshot?.snapshot?.service?.name || null,
          plan: o.snapshot?.snapshot?.plan?.name || null,
          price: o.snapshot?.snapshot?.pricing?.price || null,
        })),
      });
    } catch (err) {
      console.error("CLIENT GET ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/clients
  async create(req, res) {
    try {
      const { email, password, company, phone, address, country, city, postal } = req.body;

      const fieldErrors = validateClientFields(req.body, { requirePassword: true });
      if (Object.keys(fieldErrors).length > 0) {
        return res.status(400).json({ error: "Validation failed", fields: fieldErrors });
      }

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ error: "Email already registered" });

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await prisma.user.create({ data: { email, passwordHash } });

      const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
      if (clientRole) {
        await prisma.userRole.create({ data: { userId: user.id, roleId: clientRole.id } });
      }

      await prisma.clientProfile.create({
        data: {
          userId: user.id,
          company: company || null,
          phone: phone || null,
          address: address || null,
          country: country || null,
          city: city || null,
          postal: postal || null,
        },
      });

      await AuditService.log({
        userId: req.user.id,
        action: "admin.create_client",
        entity: "user",
        entityId: user.id,
        metadata: { email },
      });

      return res.status(201).json({ success: true, id: user.id, email: user.email });
    } catch (err) {
      console.error("CLIENT CREATE ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  // PUT /api/admin/clients/:id/profile
  async updateProfile(req, res) {
    try {
      const { id } = req.params;
      const { company, phone, address, country, city, postal } = req.body;

      const fieldErrors = validateClientFields(req.body);
      if (Object.keys(fieldErrors).length > 0) {
        return res.status(400).json({ error: "Validation failed", fields: fieldErrors });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: "Client not found" });

      const profile = await prisma.clientProfile.upsert({
        where: { userId: id },
        update: { company, phone, address, country, city, postal },
        create: { userId: id, company, phone, address, country, city, postal },
      });

      await AuditService.log({
        userId: req.user.id,
        action: "admin.update_client_profile",
        entity: "user",
        entityId: id,
      });

      return res.json({ success: true, profile });
    } catch (err) {
      console.error("CLIENT UPDATE PROFILE ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/clients/:id/activate
  async activate(req, res) {
    try {
      const { id } = req.params;
      await prisma.user.update({ where: { id }, data: { disabled: false } });
      await AuditService.log({
        userId: req.user.id,
        action: "admin.activate_client",
        entity: "user",
        entityId: id,
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/clients/:id/deactivate
  async deactivate(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      await prisma.user.update({ where: { id }, data: { disabled: true } });
      await prisma.session.deleteMany({ where: { userId: id } });
      await AuditService.log({
        userId: req.user.id,
        action: "admin.deactivate_client",
        entity: "user",
        entityId: id,
        metadata: { reason },
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/clients/:id/logout
  async forceLogout(req, res) {
    try {
      const { id } = req.params;
      await prisma.session.deleteMany({ where: { userId: id } });
      await AuditService.log({
        userId: req.user.id,
        action: "admin.force_logout_client",
        entity: "user",
        entityId: id,
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/clients/:id/reset-password
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: "Client not found" });

      await PasswordResetService.requestReset(user.email);
      await AuditService.log({
        userId: req.user.id,
        action: "admin.reset_password_client",
        entity: "user",
        entityId: id,
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/admin/clients/:id/impersonate
  async impersonate(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await ImpersonationService.startImpersonation({
        adminUser: req.user,
        targetUserId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        reason,
      });

      await AuditService.log({
        userId: req.user.id,
        action: "admin.impersonate_client",
        entity: "user",
        entityId: id,
        metadata: { reason },
      });

      const cookieOptions = {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      };

      // Save admin token so impersonation can be stopped later
      if (req.auth?.token) {
        res.cookie("_admin_token", req.auth.token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24,
        });
      }

      // Set impersonation session cookie
      res.cookie("access_token", result.accessToken, {
        ...cookieOptions,
        maxAge: parseInt(process.env.IMPERSONATION_TTL_MINUTES || "60") * 60 * 1000,
      });

      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
};

module.exports = ClientsController;
