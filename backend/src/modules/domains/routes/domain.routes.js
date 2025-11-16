// src/modules/domains/routes/domain.routes.js

const express = require("express");
const router = express.Router();
const controller = require("../controllers/domain.controller");

// ------------------------------------------------------
// IMPORTANT: STATIC ROUTES FIRST (to avoid :id conflicts)
// ------------------------------------------------------

// Pricing
router.get("/pricing", controller.getPricing);

// Availability check
router.get("/availability/check", controller.checkAvailability);

// WHOIS lookup
router.get("/whois", controller.whoisLookup);

// Register domain
router.post("/register", controller.registerDomain);

// ------------------------------------------------------
// DNS & Nameserver management — MUST come before :id
// ------------------------------------------------------

// Update nameservers
router.post("/:id/nameservers", controller.updateNameservers);

// Add DNS record
router.post("/:id/dns", controller.addDnsRecord);
//sync pricing with db
router.post("/pricing/sync", controller.syncPricing);

// ------------------------------------------------------
// CRUD ROUTES — MUST come LAST
// ------------------------------------------------------
router.get("/", controller.getAllDomains);
router.get("/:id", controller.getDomainById);
router.delete("/:id", controller.deleteDomain);

module.exports = router;
