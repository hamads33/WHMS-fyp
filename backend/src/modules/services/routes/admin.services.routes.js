/**
 * Enhanced Admin Services Routes
 * Path: src/modules/services/routes/admin.services.routes.js
 * 
 * Complete admin endpoints for professional hosting management
 */

const express = require("express");
const validate = require("../middleware/validation.middleware");
const {
  createServiceGroupDto,
  updateServiceGroupDto,
  createServiceDto,
  updateServiceDto,
  createAddonDto,
  updateAddonDto,
  createFeatureDto,
  updateFeatureDto,
  createPlanDto,
  updatePlanDto,
  createPricingDto,
  updatePricingDto,
  createAutomationDto,
  updateAutomationDto,
} = require("../dtos");

// Controllers
const serviceCtrl = require("../controllers/service.controller");
const groupCtrl = require("../controllers/service-group.controller");
const addonCtrl = require("../controllers/service-addon.controller");
const featureCtrl = require("../controllers/service-feature.controller");
const planCtrl = require("../controllers/service-plan.controller");
const pricingCtrl = require("../controllers/service-pricing.controller");
const automationCtrl = require("../controllers/service-automation.controller");
const customFieldCtrl = require("../controllers/service-custom-field.controller");
const crossSellCtrl = require("../controllers/service-cross-sell.controller");
const upgradePathCtrl = require("../controllers/service-upgrade-path.controller");

const router = express.Router();

// ============================================================
// SERVICE GROUPS
// NOTE: Mounted at /api/admin, so /services/groups = /api/admin/services/groups
// ============================================================

router.post("/services/groups", validate(createServiceGroupDto), groupCtrl.create);
router.get("/services/groups", groupCtrl.list);
router.post("/services/groups/reorder", groupCtrl.reorder);
router.post("/services/groups/bulk-update", groupCtrl.bulkUpdate);
router.post("/services/groups/bulk-delete", groupCtrl.bulkDelete);
router.get("/services/groups/:id", groupCtrl.get);
router.put("/services/groups/:id", validate(updateServiceGroupDto), groupCtrl.update);
router.delete("/services/groups/:id", groupCtrl.delete);
router.post("/services/groups/:id/toggle-visibility", groupCtrl.toggleVisibility);
router.get("/services/groups/:id/stats", groupCtrl.getStats);

// ============================================================
// SERVICES
// ============================================================

router.post(
  "/services",
  validate(createServiceDto),
  serviceCtrl.create
);
router.get("/services", serviceCtrl.list);
router.get("/services/:id", serviceCtrl.get);
router.put(
  "/services/:id",
  validate(updateServiceDto),
  serviceCtrl.update
);
router.delete("/services/:id", serviceCtrl.deactivate);
router.delete("/services/:id/hard", serviceCtrl.hardDelete);
router.post("/services/:id/toggle-visibility", serviceCtrl.toggleVisibility);
router.get("/services/:id/comparison", serviceCtrl.getComparison);
router.get("/services/:id/stats", serviceCtrl.getStats);

// ============================================================
// SERVICE ADD-ONS
// ============================================================

router.post(
  "/services/:id/addons",
  validate(createAddonDto),
  addonCtrl.create
);
router.get("/services/:id/addons", addonCtrl.listByService);
router.get("/addons/:id", addonCtrl.get);
router.put(
  "/addons/:id",
  validate(updateAddonDto),
  addonCtrl.update
);
router.delete("/addons/:id", addonCtrl.delete);
router.post("/addons/:id/toggle-active", addonCtrl.toggleActive);
router.get("/addons/:id/detailed", addonCtrl.getDetailed);
router.post("/addons/reorder", addonCtrl.reorder);

// Add-on Pricing
router.post(
  "/addons/:id/pricing",
  validate(createPricingDto),
  addonCtrl.createPricing
);

// Attach/Detach Add-ons to Plans
router.post("/addons/:addonId/plans/:planId", addonCtrl.attachToPlan);
router.delete("/addons/:addonId/plans/:planId", addonCtrl.detachFromPlan);

// ============================================================
// SERVICE FEATURES
// ============================================================

router.post(
  "/services/:id/features",
  validate(createFeatureDto),
  featureCtrl.create
);
router.get("/services/:id/features", featureCtrl.listByService);
router.get("/services/:id/features/category/:category", featureCtrl.getByCategory);
router.get("/features/:id", featureCtrl.get);
router.put(
  "/features/:id",
  validate(updateFeatureDto),
  featureCtrl.update
);
router.delete("/features/:id", featureCtrl.delete);
router.post("/features/reorder", featureCtrl.reorder);

// Set feature value for plan
router.post("/features/:featureId/plans/:planId/value", featureCtrl.setFeatureForPlan);

// Feature Comparison
router.get("/services/:id/features/comparison", featureCtrl.getComparison);
router.get("/plans/:id/features", featureCtrl.getPlanFeatures);

// ============================================================
// SERVICE PLANS
// ============================================================

router.post(
  "/services/:id/plans",
  validate(createPlanDto),
  planCtrl.create
);
router.get("/services/:id/plans", planCtrl.listByService);
router.get("/plans/:id", planCtrl.get);
router.put(
  "/plans/:id",
  validate(updatePlanDto),
  planCtrl.update
);
router.post("/plans/:id/toggle-status", planCtrl.toggleActive);
router.post("/plans/:id/activate", planCtrl.activate);
router.post("/plans/:id/deactivate", planCtrl.deactivate);
router.post("/plans/:id/toggle-visibility", planCtrl.toggleVisibility);
router.get("/plans/:id/comparison", planCtrl.getComparison);
router.get("/plans/:id/stats", planCtrl.getStats);

// ============================================================
// SERVICE PRICING
// ============================================================

router.post(
  "/plans/:id/pricing",
  validate(createPricingDto),
  pricingCtrl.create
);
router.get("/plans/:id/pricing", pricingCtrl.listByPlan);
router.get("/pricing/:id", pricingCtrl.get);
router.put(
  "/pricing/:id",
  validate(updatePricingDto),
  pricingCtrl.update
);
router.delete("/pricing/:id", pricingCtrl.delete);
router.get("/services/:id/pricing/comparison", pricingCtrl.getComparison);

// ============================================================
// SERVICE AUTOMATION
// ============================================================

router.post(
  "/services/:id/automations",
  validate(createAutomationDto),
  automationCtrl.create
);
router.get("/services/:id/automations", automationCtrl.listByService);
// Static automation routes BEFORE parameterized :id routes
router.get("/automations/available-events", automationCtrl.getAvailableEvents);
router.get("/automations/available-actions", automationCtrl.getAvailableActions);
router.get("/automations/available-modules", automationCtrl.getAvailableModules);

router.get("/automations/:id", automationCtrl.get);
router.put(
  "/automations/:id",
  validate(updateAutomationDto),
  automationCtrl.update
);
router.delete("/automations/:id", automationCtrl.delete);
router.post("/automations/:id/toggle", automationCtrl.toggleEnabled);

// Automation by event
router.get("/services/:id/automations/event/:event", automationCtrl.listByEvent);

// Preset automation creation
router.post("/services/:id/automations/provisioning", automationCtrl.createProvisioning);
router.post("/services/:id/automations/email", automationCtrl.createEmailNotification);
router.post("/services/:id/automations/webhook", automationCtrl.createWebhook);

// ============================================================
// BULK OPERATIONS
// ============================================================

router.post("/services/bulk-update", serviceCtrl.bulkUpdate);
router.post("/plans/bulk-update", planCtrl.bulkUpdate);
router.post("/services/bulk-delete", serviceCtrl.bulkDelete);
router.post("/services/bulk-hard-delete", serviceCtrl.bulkHardDelete);

// ============================================================
// IMPORTS & EXPORTS
// ============================================================

router.post("/services/import", serviceCtrl.import);
router.get("/services/export", serviceCtrl.export);
router.post("/plans/import/:serviceId", planCtrl.import);
router.get("/services/:id/plans/export", planCtrl.export);

// ============================================================
// CUSTOM FIELDS
// ============================================================

router.post("/services/:id/custom-fields", customFieldCtrl.create);
router.get("/services/:id/custom-fields", customFieldCtrl.list);
router.post("/services/:id/custom-fields/reorder", customFieldCtrl.reorder);
router.put("/services/:id/custom-fields/:fieldId", customFieldCtrl.update);
router.delete("/services/:id/custom-fields/:fieldId", customFieldCtrl.delete);

// ============================================================
// CROSS-SELLS
// ============================================================

router.post("/services/:id/cross-sells", crossSellCtrl.add);
router.get("/services/:id/cross-sells", crossSellCtrl.list);
router.delete("/services/:id/cross-sells/:crossSellServiceId", crossSellCtrl.remove);

// ============================================================
// UPGRADE PATHS
// ============================================================

router.post("/services/:id/upgrade-paths", upgradePathCtrl.create);
router.get("/services/:id/upgrade-paths", upgradePathCtrl.list);
router.put("/services/:id/upgrade-paths/:pathId", upgradePathCtrl.update);
router.delete("/services/:id/upgrade-paths/:pathId", upgradePathCtrl.delete);

module.exports = router;