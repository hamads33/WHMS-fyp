// src/modules/marketplace/index.js
// Main marketplace module initialization with all routes and services

const express = require("express");

// Services
const MarketplaceService = require("./services/marketplace.service");
const SubmissionService = require("./services/submission.service");
const VerificationService = require("./services/verification.service");
const DependencyService = require("./services/dependency.service");
const LicensingService = require("./services/licensing.service");
const AnalyticsService = require("./services/analytics.service");

// Routes
const marketplaceRoutes = require("./routes/marketplace.routes");
const developerRoutes = require("./routes/developer.routes");
const adminRoutes = require("./routes/admin.routes");
const installationRoutes = require("./routes/installation.routes");

// Middleware (MIDDLEWARE ONLY — NO FACTORIES)
const {
  requireAuth,
  requireDeveloper,
  requireAdmin, // kept for future use
} = require("./middleware/auth.middleware");

module.exports = async function initMarketplaceModule({
  app,
  prisma,
  logger = console,
  pluginEngine,
  pluginInstaller,
  pluginVerifier,
  emailService,
  webhookService,
} = {}) {
  if (!app) throw new Error("Marketplace init requires { app }");
  if (!prisma) throw new Error("Marketplace init requires { prisma }");

  logger.info("🏪 Initializing Marketplace Module...");

  // =====================================================
  // Service Initialization
  // =====================================================

  const marketplaceService = new MarketplaceService({ prisma, logger });

  const submissionService = new SubmissionService({
    prisma,
    logger,
    pluginVerifier,
    emailService,
    webhookService,
  });

  const verificationService = new VerificationService({
    prisma,
    logger,
    pluginVerifier,
    pluginEngine,
  });

  const dependencyService = new DependencyService({
    prisma,
    logger,
    pluginEngine,
  });

  const licensingService = new LicensingService({
    prisma,
    logger,
  });

  const analyticsService = new AnalyticsService({
    prisma,
    logger,
  });

  // =====================================================
  // Router Setup
  // =====================================================

  const router = express.Router();

  // -----------------------------------------------------
  // Public Marketplace Routes (NO AUTH)
  // -----------------------------------------------------
  router.use(
    "/",
    marketplaceRoutes({
      marketplaceService,
      analyticsService,
      dependencyService,
      licensingService,
      prisma,
      logger,
    })
  );

  // -----------------------------------------------------
  // Developer Routes (AUTH + ROLE ONLY)
  // -----------------------------------------------------
  router.use(
    "/developer",
    requireAuth,
    requireDeveloper,
    developerRoutes({
      submissionService,
      marketplaceService,
      analyticsService,
      pluginInstaller,
      verificationService,
      prisma,
      logger,
    })
  );

  // -----------------------------------------------------
  // Admin Routes (AUTH ONLY — ROLE CAN BE ADDED LATER)
  // -----------------------------------------------------
  router.use(
    "/admin",
    requireAuth,
    adminRoutes({
      submissionService,
      marketplaceService,
      verificationService,
      dependencyService,
      prisma,
      logger,
    })
  );

  // -----------------------------------------------------
  // Installation Routes (AUTH REQUIRED)
  // -----------------------------------------------------
  router.use(
    "/install",
    requireAuth,
    installationRoutes({
      marketplaceService,
      dependencyService,
      licensingService,
      pluginInstaller,
      analyticsService,
      pluginEngine,
      prisma,
      logger,
    })
  );

  // =====================================================
  // Mount Marketplace
  // =====================================================

  app.use("/api/marketplace", router);

  // =====================================================
  // Expose Marketplace Services
  // =====================================================

  app.locals.marketplaceServices = {
    marketplace: marketplaceService,
    submission: submissionService,
    verification: verificationService,
    dependency: dependencyService,
    licensing: licensingService,
    analytics: analyticsService,
  };

  logger.info("✅ Marketplace Module Ready");
  logger.info("   • Browse:     GET  /api/marketplace/plugins");
  logger.info("   • Install:    POST /api/marketplace/install/:productId");
  logger.info("   • Developer:  POST /api/marketplace/developer/submit");
  logger.info("   • Admin:      GET  /api/marketplace/admin/submissions");

  return {
    marketplaceService,
    submissionService,
    verificationService,
    dependencyService,
    licensingService,
    analyticsService,
  };
};
