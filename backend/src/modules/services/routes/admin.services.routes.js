const express = require("express");
const serviceCtrl = require("../controllers/service.controller");
const planCtrl = require("../controllers/service-plan.controller");
const pricingCtrl = require("../controllers/service-pricing.controller");

const router = express.Router();

// auth & rbac will be wired later
// router.use(requireAuth, requirePermission("SERVICE_MANAGE"))

router.post("/services", serviceCtrl.create);
router.get("/services", serviceCtrl.list);
router.get("/services/:id", serviceCtrl.get);
router.put("/services/:id", serviceCtrl.update);
router.delete("/services/:id", serviceCtrl.deactivate);

// plans
router.post("/services/:id/plans", planCtrl.create);
router.put("/plans/:id", planCtrl.update);

// pricing
router.post("/plans/:id/pricing", pricingCtrl.create);

module.exports = router;
