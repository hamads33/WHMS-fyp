const express = require("express");
const validate = require("../middleware/validation.middleware");
const {
  createServiceDto,
  updateServiceDto,
  createPlanDto,
  updatePlanDto,
  createPricingDto,
  updatePricingDto,
} = require("../dtos");
const serviceCtrl = require("../controllers/service.controller");
const planCtrl = require("../controllers/service-plan.controller");
const pricingCtrl = require("../controllers/service-pricing.controller");

const router = express.Router();

// ============================================================================
// SERVICES ENDPOINTS
// ============================================================================

router.post("/services", validate(createServiceDto), serviceCtrl.create);
router.get("/services", serviceCtrl.list);
router.get("/services/:id", serviceCtrl.get);
router.put("/services/:id", validate(updateServiceDto), serviceCtrl.update);
router.delete("/services/:id", serviceCtrl.deactivate);

// ============================================================================
// PLANS ENDPOINTS
// ============================================================================

router.post(
  "/services/:id/plans",
  validate(createPlanDto),
  planCtrl.create
);
router.get("/services/:id/plans", planCtrl.listByService);
router.get("/plans/:id", planCtrl.get);
router.put("/plans/:id", validate(updatePlanDto), planCtrl.update);
router.post("/plans/:id/toggle-status", planCtrl.toggleActive);
router.post("/plans/:id/activate", planCtrl.activate);
router.post("/plans/:id/deactivate", planCtrl.deactivate);

// ============================================================================
// PRICING ENDPOINTS
// ============================================================================

router.post(
  "/plans/:id/pricing",
  validate(createPricingDto),
  pricingCtrl.create
);
router.get("/plans/:id/pricing", pricingCtrl.listByPlan);
router.get("/pricing/:id", pricingCtrl.get);
router.put("/pricing/:id", validate(updatePricingDto), pricingCtrl.update);
router.delete("/pricing/:id", pricingCtrl.delete);

module.exports = router;