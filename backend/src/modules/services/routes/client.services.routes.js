const express = require("express");
const serviceCtrl = require("../controllers/service.controller");
const planCtrl = require("../controllers/service-plan.controller");
const pricingCtrl = require("../controllers/service-pricing.controller");

const router = express.Router();

// ============================================================================
// SERVICES ENDPOINTS (Client-facing - active only)
// ============================================================================

router.get("/services", serviceCtrl.listActive);
router.get("/services/:id", serviceCtrl.getActive);

// ============================================================================
// PLANS ENDPOINTS (Client-facing - active only)
// ============================================================================

router.get("/services/:id/plans", planCtrl.listActiveByService);

// ============================================================================
// PRICING ENDPOINTS (Client-facing - active only)
// ============================================================================

router.get("/plans/:id/pricing", pricingCtrl.listActiveByPlan);

module.exports = router;