const express = require("express");
const router = express.Router();
const dnsService = require("../domain/core/domain.dns.service");

/**
 * GET /api/domains/:domainId/dns
 */
router.get("/:domainId/dns", async (req, res, next) => {
  try {
    const domainId = req.params.domainId;

    const records = await dnsService.listDNS({
      domainId,
      user: req.user || null, // defensive
    });

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/domains/:domainId/dns
 */
router.post("/:domainId/dns", async (req, res, next) => {
  try {
    const domainId = req.params.domainId;
    const { type, name, value, ttl } = req.body;

    const record = await dnsService.addDNSRecord({
      domainId,
      record: { type, name, value, ttl },
      user: req.user || null,
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/domains/:domainId/dns/:recordId
 */
router.put("/:domainId/dns/:recordId", async (req, res, next) => {
  try {
    const domainId = req.params.domainId;
    const recordId = Number(req.params.recordId);

    const updated = await dnsService.updateDNSRecord({
      domainId,
      recordId,
      updates: req.body,
      user: req.user || null,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/domains/:domainId/dns/:recordId
 */
router.delete("/:domainId/dns/:recordId", async (req, res, next) => {
  try {
    const domainId = req.params.domainId;
    const recordId = Number(req.params.recordId);

    await dnsService.deleteDNSRecord({
      domainId,
      recordId,
      user: req.user || null,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
