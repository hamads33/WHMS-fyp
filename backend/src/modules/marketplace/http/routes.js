// src/modules/marketplace/http/routes.js
const express = require("express");
const multer = require("multer");

// Multer instance for ZIP uploads
const upload = multer({ dest: "uploads/marketplace" });

module.exports = function marketplaceRoutes({ controllers }) {
  const router = express.Router();

  /* ------------------------------------------------------
   * FR-M1 — Browse Marketplace Plugins
   * GET /api/marketplace/products
   * ------------------------------------------------------ */
  router.get("/products", controllers.browseProducts);

  /* ------------------------------------------------------
   * FR-M2 — View Product Details
   * GET /api/marketplace/products/:productId
   * ------------------------------------------------------ */
  router.get("/products/:productId", controllers.getDetails);

  /* ------------------------------------------------------
   * FR-M11 — Add / Edit / Update Plugin Information
   * POST /api/marketplace/products
   * PUT  /api/marketplace/products/:productId
   * ------------------------------------------------------ */
  router.post("/products", controllers.createProduct);
  router.put("/products/:productId", controllers.updateProduct);

  /* ------------------------------------------------------
   * FR-M6 — Developer submits new version (metadata only)
   * POST /api/marketplace/products/:productId/versions
   * ------------------------------------------------------ */
  router.post("/products/:productId/versions", controllers.submitVersion);

  /* ------------------------------------------------------
   * NEW — ZIP Upload → Extract → Register Version → Submit → Verify
   * POST /api/marketplace/products/:productId/upload
   * ------------------------------------------------------ */
  router.post(
    "/products/:productId/upload",
    upload.single("file"),               // IMPORTANT
    controllers.uploadVersion
  );

  /* ------------------------------------------------------
   * FR-M8 — Verification
   * POST /api/marketplace/versions/:versionId/verify
   * ------------------------------------------------------ */
  router.post("/versions/:versionId/verify", controllers.verifyPlugin);

  /* ------------------------------------------------------
   * FR-M5 — Licensing System
   * POST /api/marketplace/purchase/:productId
   * POST /api/marketplace/license/validate
   * ------------------------------------------------------ */
  router.post("/purchase/:productId", controllers.purchase);
  router.post("/license/validate", controllers.validateLicense);

  /* ------------------------------------------------------
   * FR-M10 — Reviews
   * POST /api/marketplace/products/:productId/review
   * ------------------------------------------------------ */
  router.post("/products/:productId/review", controllers.addReview);

  /* ------------------------------------------------------
   * FR-M9 — Analytics Overview
   * GET /api/marketplace/analytics/overview
   * ------------------------------------------------------ */
  router.get("/analytics/overview", controllers.analytics);

  return router;
};
