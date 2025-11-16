// src/modules/automation/automation.routes.js

const express = require("express");
const router = express.Router();
const controller = require("./automation.controller");

// Manual admin sync trigger
router.post("/pricing/sync", controller.triggerPricingSync);

module.exports = router;
