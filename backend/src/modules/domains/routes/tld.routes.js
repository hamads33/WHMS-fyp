// src/modules/domains/routes/tld.routes.js
const express = require("express");
const router = express.Router();

const tldController = require("../controllers/tld.controller");
const tldPricingController = require("../controllers/tldPricing.controller");

// ------------------------------------------------------
// STATIC ROUTES — must come BEFORE "/"
// ------------------------------------------------------

// Live pricing from Porkbun (fast endpoint)
router.get("/pricing", tldPricingController.getLivePricing);

// Sync pricing from Porkbun API → DB
router.post("/sync", tldController.syncPricing);

// Create/Update TLD record in DB
router.post("/", tldController.createOrUpdateTld);

// Get all stored TLD pricing (DB only)
router.get("/", tldController.getAllTlds);

module.exports = router;
