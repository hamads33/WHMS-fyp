const prisma = require("../../../../prisma");
const { lookupWhois } = require("../services/whois.service");
const domainSettings = require("../services/domain-settings.service");
const { loadRegistrar } = require("../registrars");
const { adminRenewDomain } = require("../domain/core/domain.admin.service");
const {
  normalizeRegistrarError,
  unsupportedCapabilityError,
} = require("../utils/registrar-errors");
const {
  penniesToDisplay,
  penniesToDollars,
  toPennies,
} = require("../utils/pennies");

function getRegistrarCapabilities(driver) {
  return typeof driver.getCapabilities === "function"
    ? driver.getCapabilities()
    : {};
}

async function getDomainOrThrow(domainId) {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    include: {
      dnsRecords: true,
      logs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!domain) {
    const err = new Error("Domain not found");
    err.statusCode = 404;
    err.errorCode = "DOMAIN_NOT_FOUND";
    throw err;
  }

  return domain;
}

async function resolveDriverForDomain(domainId) {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });

  if (!domain) {
    const err = new Error("Domain not found");
    err.statusCode = 404;
    err.errorCode = "DOMAIN_NOT_FOUND";
    throw err;
  }

  if (!domain.registrar) {
    const err = new Error("This domain does not have a registrar assigned");
    err.statusCode = 400;
    err.errorCode = "REGISTRAR_MISSING";
    throw err;
  }

  const driver = loadRegistrar(domain.registrar);

  return {
    domain,
    driver,
    capabilities: getRegistrarCapabilities(driver),
  };
}

function getTld(domainName = "") {
  const parts = String(domainName).split(".");
  return parts.length > 1 ? parts.slice(1).join(".").toLowerCase() : "";
}

async function getLivePricing({ driver, domainName, action }) {
  const tld = getTld(domainName);

  if (typeof driver.getPricing === "function" && tld) {
    const pricing = await driver.getPricing([tld]);
    const tldPricing = pricing?.[tld] || pricing?.[`.${tld}`] || pricing?.[tld.toUpperCase()];

    if (tldPricing) {
      const rawPrice = action === "renew"
        ? tldPricing.renewal ?? tldPricing.renew ?? tldPricing.registration
        : tldPricing.registration ?? tldPricing.register ?? tldPricing.renewal;

      if (rawPrice !== null && rawPrice !== undefined) {
        return {
          priceInPennies: toPennies(rawPrice, `${action} price`),
          source: "pricing",
        };
      }
    }
  }

  if (typeof driver.checkAvailability === "function") {
    const availability = await driver.checkAvailability(domainName);
    if (availability?.price !== null && availability?.price !== undefined) {
      return {
        priceInPennies: toPennies(availability.price, `${action} price`),
        source: "availability",
      };
    }
  }

  return {
    priceInPennies: null,
    source: "unavailable",
  };
}

function withRegistrarErrors(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      const registrar = err.registrar || req.domainRegistrar;
      next(normalizeRegistrarError(err, registrar));
    }
  };
}

const controller = {
  getSettings: withRegistrarErrors(async (req, res) => {
    const { category } = req.query;
    const settings = await domainSettings.getSettings(category || null);
    res.json({ success: true, settings });
  }),

  updateSettings: withRegistrarErrors(async (req, res) => {
    const updates = req.body || {};
    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        domainSettings.setSetting(key, value)
      )
    );
    res.json({ success: true, message: "Registrar settings saved" });
  }),

  testSettings: withRegistrarErrors(async (req, res) => {
    const { registrar } = req.query;
    if (!registrar) {
      return res.status(400).json({ error: "registrar param required" });
    }

    const mod = loadRegistrar(registrar);
    await mod.checkAvailability("testconnection.com");
    res.json({ success: true, message: `${registrar} credentials are valid` });
  }),

  getStats: withRegistrarErrors(async (_req, res) => {
    const now = new Date();
    const expiringSoonLimit = new Date();
    expiringSoonLimit.setDate(expiringSoonLimit.getDate() + 30);

    const [total, active, expired, expiringSoon] = await Promise.all([
      prisma.domain.count(),
      prisma.domain.count({ where: { status: "active" } }),
      prisma.domain.count({ where: { status: "expired" } }),
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
      data: { total, active, expiringSoon, expired },
    });
  }),

  getWhois: withRegistrarErrors(async (req, res) => {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ error: "domain query parameter is required" });
    }

    const result = await lookupWhois(domain);
    res.json({ success: true, data: result });
  }),

  getExpiringDomains: withRegistrarErrors(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const now = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + days);

    const domains = await prisma.domain.findMany({
      where: {
        status: "active",
        expiryDate: {
          gte: now,
          lte: limit,
        },
      },
      orderBy: { expiryDate: "asc" },
    });

    res.json({ success: true, data: domains });
  }),

  listDomains: withRegistrarErrors(async (req, res) => {
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
  }),

  getDomain: withRegistrarErrors(async (req, res) => {
    const domain = await getDomainOrThrow(req.params.domainId || req.params.id);
    let capabilities = {};

    if (domain.registrar) {
      try {
        const driver = loadRegistrar(domain.registrar);
        capabilities = getRegistrarCapabilities(driver);
      } catch {
        capabilities = {};
      }
    }

    res.json({
      success: true,
      data: {
        ...domain,
        registrarCapabilities: capabilities,
      },
    });
  }),

  getLogs: withRegistrarErrors(async (req, res) => {
    const domainId = req.params.domainId || req.params.id;
    const { limit = 50 } = req.query;

    const logs = await prisma.domainLog.findMany({
      where: { domainId },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });

    res.json({ success: true, data: logs });
  }),

  renewDomain: withRegistrarErrors(async (req, res) => {
    const updated = await adminRenewDomain({
      domainId: req.params.domainId || req.params.id,
      adminId: req.user?.id || "system",
      years: Number(req.body.years || 1),
      currency: req.body.currency || "USD",
      priceOverride: req.body.priceOverride ?? null,
      callRegistrar: req.body.callRegistrar ?? false,
    });

    res.json({ success: true, data: updated });
  }),

  overrideDomain: withRegistrarErrors(async (req, res) => {
    const domainId = req.params.domainId || req.params.id;
    const { changes } = req.body;

    const updated = await prisma.domain.update({
      where: { id: domainId },
      data: changes,
    });

    await prisma.domainLog.create({
      data: {
        domainId,
        action: "admin_override",
        meta: changes,
      },
    });

    res.json({ success: true, data: updated });
  }),

  syncDomain: withRegistrarErrors(async (req, res) => {
    const { domain, driver } = await resolveDriverForDomain(req.params.domainId || req.params.id);
    req.domainRegistrar = domain.registrar;

    if (typeof driver.sync !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "domain sync");
    }

    const syncResult = await driver.sync({ domain: domain.name });

    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data: {
        status: syncResult.status || domain.status,
        expiryDate: syncResult.expiryDate || domain.expiryDate,
        autoRenew: syncResult.autoRenew ?? domain.autoRenew,
        metadata: {
          ...(domain.metadata || {}),
          lastSyncedAt: new Date().toISOString(),
          lastSyncResult: syncResult,
        },
      },
    });

    await prisma.domainLog.create({
      data: {
        domainId: domain.id,
        action: "sync",
        meta: { registrar: domain.registrar, syncResult },
      },
    });

    res.json({ success: true, data: updated });
  }),

  deleteDomain: withRegistrarErrors(async (req, res) => {
    const domainId = req.params.domainId || req.params.id;

    const updated = await prisma.domain.update({
      where: { id: domainId },
      data: { status: "cancelled" },
    });

    await prisma.domainLog.create({
      data: {
        domainId,
        action: "admin_domain_cancelled",
        meta: { timestamp: new Date().toISOString() },
      },
    });

    res.json({ success: true, data: updated });
  }),

  getCapabilities: withRegistrarErrors(async (req, res) => {
    const { domain, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;
    res.json({ success: true, data: capabilities });
  }),

  getDns: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageDNS || typeof driver.getDNS !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "DNS management");
    }

    const result = await driver.getDNS({ domain: domain.name });
    res.json({ success: true, data: result });
  }),

  createDns: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageDNS || typeof driver.updateDNS !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "DNS management");
    }

    const result = await driver.updateDNS({
      domain: domain.name,
      action: "create",
      record: req.body,
    });

    await prisma.domainLog.create({
      data: {
        domainId: domain.id,
        action: "dns_record_created",
        meta: req.body,
      },
    });

    res.status(201).json({ success: true, data: result });
  }),

  updateDns: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageDNS || typeof driver.updateDNS !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "DNS management");
    }

    const result = await driver.updateDNS({
      domain: domain.name,
      action: "update",
      recordId: req.params.recordId,
      record: req.body,
    });

    await prisma.domainLog.create({
      data: {
        domainId: domain.id,
        action: "dns_record_updated",
        meta: { recordId: req.params.recordId, updates: req.body },
      },
    });

    res.json({ success: true, data: result });
  }),

  deleteDns: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageDNS || typeof driver.updateDNS !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "DNS management");
    }

    const result = await driver.updateDNS({
      domain: domain.name,
      action: "delete",
      recordId: req.params.recordId,
    });

    await prisma.domainLog.create({
      data: {
        domainId: domain.id,
        action: "dns_record_deleted",
        meta: { recordId: req.params.recordId },
      },
    });

    res.json({ success: true, data: result });
  }),

  getGlue: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageGlue || typeof driver.getGlue !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "glue records");
    }

    const result = await driver.getGlue({ domain: domain.name });
    res.json({ success: true, data: result });
  }),

  createGlue: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageGlue || typeof driver.updateGlue !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "glue records");
    }

    const result = await driver.updateGlue({
      domain: domain.name,
      action: "create",
      subdomain: req.body.subdomain,
      ips: req.body.ips || [],
    });

    res.status(201).json({ success: true, data: result });
  }),

  updateGlue: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageGlue || typeof driver.updateGlue !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "glue records");
    }

    const result = await driver.updateGlue({
      domain: domain.name,
      action: "update",
      subdomain: req.params.subdomain,
      ips: req.body.ips || [],
    });

    res.json({ success: true, data: result });
  }),

  deleteGlue: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageGlue || typeof driver.updateGlue !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "glue records");
    }

    const result = await driver.updateGlue({
      domain: domain.name,
      action: "delete",
      subdomain: req.params.subdomain,
    });

    res.json({ success: true, data: result });
  }),

  getForwarding: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canForwardURL || typeof driver.getForwarding !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "URL forwarding");
    }

    const result = await driver.getForwarding({ domain: domain.name });
    res.json({ success: true, data: result });
  }),

  createForwarding: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canForwardURL || typeof driver.updateForwarding !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "URL forwarding");
    }

    const result = await driver.updateForwarding({
      domain: domain.name,
      action: "create",
      forward: req.body,
    });

    res.status(201).json({ success: true, data: result });
  }),

  deleteForwarding: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canForwardURL || typeof driver.updateForwarding !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "URL forwarding");
    }

    const result = await driver.updateForwarding({
      domain: domain.name,
      action: "delete",
      forwardId: req.params.forwardId,
    });

    res.json({ success: true, data: result });
  }),

  getSsl: withRegistrarErrors(async (req, res) => {
    const { domain, driver, capabilities } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    if (!capabilities.canManageSSL || typeof driver.getSSL !== "function") {
      throw unsupportedCapabilityError(domain.registrar, "SSL retrieval");
    }

    const result = await driver.getSSL({ domain: domain.name });
    res.json({ success: true, data: result });
  }),

  checkDomainPrice: withRegistrarErrors(async (req, res) => {
    const { registrar, domain, action = "register" } = req.body;
    if (!registrar || !domain) {
      return res.status(400).json({ error: "registrar and domain are required" });
    }

    const driver = loadRegistrar(registrar);
    const { priceInPennies, source } = await getLivePricing({
      driver,
      domainName: domain,
      action,
    });

    res.json({
      success: true,
      data: {
        action,
        registrar,
        domain,
        source,
        priceInPennies,
        exactUsdCost: penniesToDollars(priceInPennies),
        exactUsdDisplay: penniesToDisplay(priceInPennies, "USD"),
      },
    });
  }),

  checkRenewalPrice: withRegistrarErrors(async (req, res) => {
    const { domain, driver } = await resolveDriverForDomain(req.params.domainId);
    req.domainRegistrar = domain.registrar;

    const { priceInPennies, source } = await getLivePricing({
      driver,
      domainName: domain.name,
      action: "renew",
    });

    res.json({
      success: true,
      data: {
        action: "renew",
        registrar: domain.registrar,
        domain: domain.name,
        source,
        priceInPennies: priceInPennies ?? domain.renewalPrice ?? domain.registrationPrice ?? null,
        exactUsdCost: penniesToDollars(priceInPennies ?? domain.renewalPrice ?? domain.registrationPrice ?? null),
        exactUsdDisplay: penniesToDisplay(priceInPennies ?? domain.renewalPrice ?? domain.registrationPrice ?? null, "USD"),
      },
    });
  }),

  syncAllDomains: withRegistrarErrors(async (req, res) => {
    const { registrar = "porkbun" } = req.query;

    const driver = loadRegistrar(registrar);

    if (typeof driver.listDomains !== "function") {
      throw new Error(`Registrar ${registrar} does not support listing domains`);
    }

    const result = await driver.listDomains();
    const apiDomains = result.domains || [];

    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      throw new Error("No users found in database to assign domain ownership");
    }

    const synced = [];
    const failed = [];

    for (const apiDomain of apiDomains) {
      try {
        const existing = await prisma.domain.findUnique({
          where: { name: apiDomain.domain }
        });

        if (existing) {
          await prisma.domain.update({
            where: { id: existing.id },
            data: {
              status: apiDomain.status,
              expiryDate: apiDomain.expiryDate,
              autoRenew: apiDomain.autoRenew,
              metadata: {
                ...(existing.metadata || {}),
                locked: apiDomain.locked,
                whoisPrivacy: apiDomain.whoisPrivacy,
                lastSyncedAt: new Date().toISOString(),
              }
            }
          });
          synced.push({ domain: apiDomain.domain, action: "updated" });
        } else {
          const created = await prisma.domain.create({
            data: {
              name: apiDomain.domain,
              registrar,
              status: apiDomain.status,
              expiryDate: apiDomain.expiryDate,
              autoRenew: apiDomain.autoRenew,
              ownerId: firstUser.id,
              metadata: {
                locked: apiDomain.locked,
                whoisPrivacy: apiDomain.whoisPrivacy,
                lastSyncedAt: new Date().toISOString(),
              }
            }
          });
          synced.push({ domain: apiDomain.domain, action: "created", id: created.id });
        }
      } catch (err) {
        failed.push({ domain: apiDomain.domain, error: err.message });
      }
    }

    res.json({
      success: true,
      registrar,
      synced: synced.length,
      failed: failed.length,
      details: {
        synced,
        failed
      }
    });
  }),
};

module.exports = controller;
