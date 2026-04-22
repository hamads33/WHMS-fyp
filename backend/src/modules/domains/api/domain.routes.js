const express = require("express");
const router = express.Router();
const prisma = require("../../../../prisma");

const {
  checkAvailability,
  registerDomain
} = require("../domain/core/domain.service");

const { initiateTransfer } = require("../domain/core/domain.transfer");
const { lookupWhois } = require("../services/whois.service");

/**
 * GET /domains
 * List domains for a user (filter by ownerId query param)
 */
router.get("/", async (req, res, next) => {
  try {
    const { ownerId, status } = req.query;
    const where = {};
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;

    const domains = await prisma.domain.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: domains });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /domains/whois?domain=example.com
 * Public WHOIS/RDAP lookup — free, no credentials required
 */
router.get("/whois", async (req, res, next) => {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ error: "domain query parameter is required" });
    }
    const result = await lookupWhois(domain);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /domains/:id
 * Get a single domain by ID with DNS records
 */
router.get("/:id", async (req, res, next) => {
  try {
    const domain = await prisma.domain.findUnique({
      where: { id: req.params.id },
      include: { dnsRecords: true, contacts: true },
    });

    if (!domain) {
      return res.status(404).json({ error: "Domain not found" });
    }

    res.json({ success: true, data: domain });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /domains/check
 * Check domain availability
 */
router.post("/check", async (req, res, next) => {
  try {
    const result = await checkAvailability(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /domains/register
 * Register a domain
 */
router.post("/register", async (req, res, next) => {
  try {
    // ✅ VALIDATION: Ensure currency is provided
    if (!req.body.currency) {
      return res.status(400).json({
        error: "Missing required field: currency"
      });
    }

    // ✅ FIX: Use authenticated user's ID if ownerId not provided
    const ownerId = req.body.ownerId || req.user?.id;

    if (!ownerId) {
      return res.status(401).json({
        error: "Authentication required or ownerId must be provided"
      });
    }

    const domain = await registerDomain({
      ...req.body,
      ownerId  // Ensure ownerId is set
    });
    res.json({ success: true, data: domain });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /domains/transfer
 * Initiate domain transfer (EPP)
 */
router.post("/transfer", async (req, res, next) => {
  try {
    // ✅ VALIDATION: Ensure currency is provided
    if (!req.body.currency) {
      return res.status(400).json({
        error: "Missing required field: currency"
      });
    }

    // ✅ FIX: Use authenticated user's ID if ownerId not provided
    const ownerId = req.body.ownerId || req.user?.id;

    if (!ownerId) {
      return res.status(401).json({
        error: "Authentication required or ownerId must be provided"
      });
    }

    const result = await initiateTransfer({
      ...req.body,
      ownerId  // Ensure ownerId is set
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /domains/:domainId/nameservers
 * Update nameservers for a domain
 */
router.put("/:domainId/nameservers", async (req, res, next) => {
  try {
    const domainId = req.params.domainId;
    const { nameservers } = req.body;

    if (!Array.isArray(nameservers)) {
      return res.status(400).json({ error: "nameservers must be an array" });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      return res.status(404).json({ error: "Domain not found" });
    }

    const updated = await prisma.domain.update({
      where: { id: domainId },
      data: { nameservers },
    });

    await prisma.domainLog.create({
      data: {
        domainId,
        action: "nameservers_updated",
        meta: { nameservers },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /domains/:domainId/renew
 * Renew a domain (user-facing)
 */
router.post("/:domainId/renew", async (req, res, next) => {
  try {
    const domainId = req.params.domainId;
    const { years = 1 } = req.body;

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
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
      where: { id: domainId },
      data: {
        expiryDate: newExpiryDate,
        status: "active",
      },
    });

    await prisma.domainLog.create({
      data: {
        domainId,
        action: "domain_renewed",
        meta: { years: Number(years) },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;