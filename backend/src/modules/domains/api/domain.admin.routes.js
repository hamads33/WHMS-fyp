const express = require("express");
const controller = require("../controllers/domain.admin.controller");

const router = express.Router();

router.get("/settings", controller.getSettings);
router.put("/settings", controller.updateSettings);
router.post("/settings/test", controller.testSettings);

router.get("/stats", controller.getStats);
router.get("/whois", controller.getWhois);
router.get("/expiring", controller.getExpiringDomains);
router.post("/check-domain-pricing", controller.checkDomainPrice);

router.get("/", controller.listDomains);
router.get("/:id", controller.getDomain);
router.get("/:id/logs", controller.getLogs);
router.post("/:id/renew", controller.renewDomain);
router.patch("/:id/override", controller.overrideDomain);
router.post("/:id/sync", controller.syncDomain);
router.delete("/:id", controller.deleteDomain);

router.get("/:domainId/capabilities", controller.getCapabilities);

router.get("/:domainId/dns", controller.getDns);
router.post("/:domainId/dns", controller.createDns);
router.put("/:domainId/dns/:recordId", controller.updateDns);
router.delete("/:domainId/dns/:recordId", controller.deleteDns);

router.get("/:domainId/glue", controller.getGlue);
router.post("/:domainId/glue", controller.createGlue);
router.put("/:domainId/glue/:subdomain", controller.updateGlue);
router.delete("/:domainId/glue/:subdomain", controller.deleteGlue);

router.get("/:domainId/forwarding", controller.getForwarding);
router.post("/:domainId/forwarding", controller.createForwarding);
router.delete("/:domainId/forwarding/:forwardId", controller.deleteForwarding);

router.get("/:domainId/ssl", controller.getSsl);
router.post("/:domainId/price-check", controller.checkRenewalPrice);

module.exports = router;
