const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/* =====================================================
   ADMIN DOMAIN ROUTES
   Base path: /api/admin/domains
===================================================== */

/**
 * GET /api/admin/domains/stats
 * NOTE:
 * - Enum values are lowercase (schema-defined)
 * - "expiringSoon" is derived from expiryDate (NOT a status)
 */
router.get("/stats", async (req, res, next) => {
  try {
    const now = new Date();
    const expiringSoonLimit = new Date();
    expiringSoonLimit.setDate(expiringSoonLimit.getDate() + 30);

    const [total, active, expired, expiringSoon] = await Promise.all([
      prisma.domain.count(),

      prisma.domain.count({
        where: { status: "active" },
      }),

      prisma.domain.count({
        where: { status: "expired" },
      }),

      prisma.domain.count({
        where: {
          status: "active",
          expiryDate: {
            gte: now,
            lte: expiringSoonLimit,
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        expiringSoon,
        expired,
      },
    });
  } catch (err) {
    console.error("DOMAIN STATS ERROR:", err);
    next(err);
  }
});

/**
 * GET /api/admin/domains
 */
router.get("/", async (req, res, next) => {
  try {
    const { status, registrar, search, limit = 100, page = 1 } = req.query;
    const skip = (page - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (registrar) where.registrar = registrar;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { ownerId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.domain.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.domain.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/domains/:id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const domain = await prisma.domain.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        dnsRecords: true,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        error: "Domain not found",
      });
    }

    res.json({ success: true, data: domain });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/domains/:id/logs
 */
router.get("/:id/logs", async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const logs = await prisma.domainLog.findMany({
      where: { domainId: Number(req.params.id) },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/domains/:id/renew
 */
router.post("/:id/renew", async (req, res, next) => {
  try {
    const { years = 1 } = req.body;

    const domain = await prisma.domain.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!domain || !domain.expiryDate) {
      return res.status(404).json({
        success: false,
        error: "Domain not found or missing expiry date",
      });
    }

    const newExpiryDate = new Date(domain.expiryDate);
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + Number(years));

    const updated = await prisma.domain.update({
      where: { id: Number(req.params.id) },
      data: {
        expiryDate: newExpiryDate,
        status: "active",
      },
    });

    await prisma.domainLog.create({
      data: {
        domainId: Number(req.params.id),
        action: "admin_renew",
        meta: { years },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/domains/:id/override
 */
router.patch("/:id/override", async (req, res, next) => {
  try {
    const { changes } = req.body;

    const updated = await prisma.domain.update({
      where: { id: Number(req.params.id) },
      data: changes,
    });

    await prisma.domainLog.create({
      data: {
        domainId: Number(req.params.id),
        action: "admin_override",
        meta: changes,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/domains/:id/sync
 */
router.post("/:id/sync", async (req, res, next) => {
  try {
    const domain = await prisma.domain.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        error: "Domain not found",
      });
    }

    const updated = await prisma.domain.update({
      where: { id: Number(req.params.id) },
      data: {
        metadata: {
          ...domain.metadata,
          lastSyncedAt: new Date().toISOString(),
        },
      },
    });

    await prisma.domainLog.create({
      data: {
        domainId: Number(req.params.id),
        action: "sync",
        meta: { registrar: domain.registrar },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/domains/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const updated = await prisma.domain.update({
      where: { id: Number(req.params.id) },
      data: { cancelled: true },
    });

    await prisma.domainLog.create({
      data: {
        domainId: Number(req.params.id),
        action: "admin_delete",
        meta: { timestamp: new Date().toISOString() },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
