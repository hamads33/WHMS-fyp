/**
 * Store Routes — /api/store/
 *
 * Truly public (no API key, no auth).
 * Used by the WHMS-native hosted storefront (/store page in the frontend).
 * External sites can also query these to build custom UIs if needed.
 */
const { Router } = require("express");
const cors       = require("cors");
const StoreController = require("./controllers/store.controller");

const router = Router();

// Allow any origin — storefront is intentionally public
router.use(cors({ origin: "*", methods: ["GET"] }));

router.get("/services",     StoreController.listServices);
router.get("/services/:id", StoreController.getService);
router.get("/plans",        StoreController.listPlans);

module.exports = router;
