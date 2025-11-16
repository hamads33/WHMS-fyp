// src/modules/domains/controllers/domain.controller.js

const domainService = require("../services/domain.service");

// ------------------------------------------------------
// GET ALL DOMAINS
// ------------------------------------------------------
exports.getAllDomains = async (req, res) => {
  try {
    const list = await domainService.getAllDomains();
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("getAllDomains Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// ------------------------------------------------------
// GET DOMAIN BY ID
// ------------------------------------------------------
exports.getDomainById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid domain id" });
    }

    const domain = await domainService.getDomainById(id);
    if (!domain) {
      return res
        .status(404)
        .json({ success: false, error: "Domain not found" });
    }

    return res.json({ success: true, data: domain });
  } catch (err) {
    console.error("getDomainById Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// ------------------------------------------------------
// CHECK AVAILABILITY (PORKBUN + fallback WHOIS)
// ------------------------------------------------------
exports.checkAvailability = async (req, res) => {
  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "domain query required",
      });
    }

    const result = await domainService.checkAvailability(domain.trim());

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("checkAvailability Error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// ------------------------------------------------------
// WHOIS LOOKUP
// ------------------------------------------------------
exports.whoisLookup = async (req, res) => {
  try {
    const domain = req.query.domain;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "domain query required",
      });
    }

    const cleaned = domain
      .replace(/^https?:\/\//, "")
      .replace("www.", "")
      .replace(/\/.*$/, "")
      .trim();

    const result = await domainService.whoisLookup(cleaned);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "WHOIS lookup failed",
      });
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("WHOIS Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal WHOIS error",
    });
  }
};

// ------------------------------------------------------
// REGISTER DOMAIN (Hybrid Mode B: MOCK Write / Porkbun Read)
// ------------------------------------------------------
exports.registerDomain = async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || !payload.domain) {
      return res.status(400).json({
        success: false,
        error: "domain required",
      });
    }

    const result = await domainService.registerDomain(payload);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "Registration failed",
        raw: result.raw || null,
      });
    }

    return res.json({
      success: true,
      data: result.domain,
      raw: result.raw,
    });
  } catch (err) {
    console.error("registerDomain Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// ------------------------------------------------------
// ADD DNS RECORD (MOCK or Porkbun if supported)
// ------------------------------------------------------
exports.addDnsRecord = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid domain id",
      });
    }

    const { type, name, value, ttl } = req.body;

    if (!type || !name || !value) {
      return res.status(400).json({
        success: false,
        error: "type, name, value required",
      });
    }

    const updated = await domainService.addDnsRecord(id, {
      type,
      name,
      value,
      ttl: ttl || 300,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("addDnsRecord Error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// ------------------------------------------------------
// UPDATE NAMESERVERS
// ------------------------------------------------------
exports.updateNameservers = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid domain id",
      });
    }

    const { nameservers } = req.body;

    if (!nameservers || !Array.isArray(nameservers)) {
      return res.status(400).json({
        success: false,
        error: "nameservers array required",
      });
    }

    const updated = await domainService.updateNameservers(id, nameservers);

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateNameservers Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// ------------------------------------------------------
// DELETE DOMAIN (Soft Delete)
// ------------------------------------------------------
exports.deleteDomain = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid domain id",
      });
    }

    const deleted = await domainService.deleteDomain(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Domain not found",
      });
    }

    return res.json({
      success: true,
      message: "Domain deleted successfully",
    });
  } catch (err) {
    console.error("deleteDomain Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// ------------------------------------------------------
// PORKBUN PRICING API
// ------------------------------------------------------
exports.getPricing = async (req, res) => {
  try {
    const pricing = await domainService.getPricing();

    return res.json({
      success: true,
      data: pricing,
    });
  } catch (err) {
    console.error("Pricing error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Unable to fetch pricing",
    });
  }
};
exports.syncPricing = async (req, res) => {
  try {
    const result = await domainService.syncPricingToDb();
    return res.json({ success: true, data: result, message: "Pricing synced" });
  } catch (err) {
    console.error("Sync pricing error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
