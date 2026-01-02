const express = require("express");
const router = express.Router();
const dnsService = require("../domain/core/domain.dns.service");

router.get("/:domainId/dns", async (req, res) => {
  res.json(await dnsService.listDNS(req.params));
});

router.post("/:domainId/dns", async (req, res) => {
  res.json(await dnsService.addDNSRecord({
    domainId: req.params.domainId,
    record: req.body
  }));
});

router.put("/:domainId/dns/:recordId", async (req, res) => {
  res.json(await dnsService.updateDNSRecord({
    domainId: req.params.domainId,
    recordId: req.params.recordId,
    updates: req.body
  }));
});

router.delete("/:domainId/dns/:recordId", async (req, res) => {
  res.json(await dnsService.deleteDNSRecord({
    domainId: req.params.domainId,
    recordId: req.params.recordId
  }));
});

module.exports = router;
