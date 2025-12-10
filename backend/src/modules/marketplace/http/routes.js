// const express = require("express");
// const multer = require("multer");

// const upload = multer({ dest: "uploads/marketplace" });

// // Controller loader
// const buildControllers = require("./controllers");

// module.exports = function marketplaceRoutes(deps = {}) {
//   const router = express.Router();
//   const controllers = buildControllers(deps);

//   //
//   // -------------------------
//   // PUBLIC ROUTES
//   // -------------------------
//   //

//   // Browse products
//   router.get("/products", controllers.public.browseProducts);

//   // Product details by slug
//   router.get("/products/:slug", controllers.public.getProductDetails);

//   // Add review
//   router.post("/products/:productId/reviews", controllers.public.addReview);

//   // Version check
//   router.get(
//     "/products/:productId/check-updates",
//     controllers.versionCheck
//   );

//   //
//   // -------------------------
//   // PRODUCT MANAGEMENT
//   // -------------------------
//   //

//   // Create product
//   router.post("/products", controllers.product.create);

//   // Update product info
//   router.put("/products/:productId", controllers.product.update);

//   //
//   // -------------------------
//   // VERSION MANAGEMENT
//   // -------------------------
//   //

//   // // Upload plugin ZIP
//   // router.post(
//   //   "/products/:productId/upload",
//   //   upload.single("file"),
//   //   controllers.version.uploadVersion
//   // );

//   // // Submit version for review
//   // router.post(
//   //   "/products/:productId/versions/:versionId/submit",
//   //   controllers.version.submitVersion
//   // );

//   // // Verify plugin (runtime verifier)
//   // router.post(
//   //   "/versions/:versionId/verify",
//   //   controllers.version.verifyVersion
//   // );

//   //
//   // -------------------------
//   // PURCHASE + LICENSING
//   // -------------------------
//   //

//   // // Purchase plugin
//   // router.post(
//   //   "/products/:productId/purchase",
//   //   controllers.purchase.purchasePlugin
//   // );

//   // // Validate license
//   // router.post(
//   //   "/licenses/validate",
//   //   controllers.purchase.validateLicense
//   // );

//   //
//   // -------------------------
//   // SELLER PANEL BASIC ROUTES
//   // // -------------------------
//   // //

//   // router.get("/seller/dashboard", controllers.seller.dashboard);
//   // router.get("/seller/payouts", controllers.seller.payouts);

//   return router;
// };
