/**
 * plugin-marketplace.routes.js
 * ------------------------------------------------------------------
 * Route definitions for the plugin marketplace.
 *
 * Auth model:
 *   Public    — GET listing, GET by slug  (no auth)
 *   Developer — create plugin, submit/upload version  (authGuard + developerPortalGuard)
 *   Admin     — list all, view details   (authGuard + adminPortalGuard)
 *   Superadmin only — approve / reject   (authGuard + superadminOnlyGuard)
 *   Install   — authGuard only (admin or superadmin triggers install)
 *
 * Usage in app.js:
 *   const marketplaceRoutes = require("./modules/plugin-marketplace/plugin-marketplace.routes");
 *   app.use("/api", marketplaceRoutes({ app, prisma, logger }));
 */

const path   = require("path");
const fs     = require("fs");
const { Router } = require("express");
const multer = require("multer");

const PluginMarketplaceService    = require("./plugin-marketplace.service");
const PluginInstallerService      = require("./plugin-installer.service");
const PluginUpdateService         = require("./plugin-update.service");
const PluginInstallQueue          = require("./plugin-install-queue.service");
const PluginBillingService        = require("./plugin-billing.service");
const PluginMarketplaceController = require("./plugin-marketplace.controller");

const authGuard           = require("../auth/middlewares/auth.guard");
const adminPortalGuard    = require("../auth/guards/adminPortal.guard");
const developerPortalGuard = require("../auth/guards/developerPortal.guard");
const superadminOnlyGuard = require("../auth/guards/superadminOnly.guard");
const storagePathsService = require("../settings/storage-paths.service");
const pluginStateService  = require("../../core/plugin-system/plugin-state.service");
const pluginStats         = require("./plugin-stats.service");

// ── Multer — zip uploads ─────────────────────────────────────────
const zipStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const dir = await storagePathsService.resolve("pluginUploadsPath");
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ts   = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});

const zipFilter = (req, file, cb) => {
  if (file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.endsWith(".zip")) {
    cb(null, true);
  } else {
    cb(new Error("Only .zip files are accepted"), false);
  }
};

const uploadZip = multer({
  storage : zipStorage,
  fileFilter: zipFilter,
  limits  : { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

// ── Multer — asset uploads (icon + screenshots) ─────────────────
const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files accepted (jpg, png, gif, webp)"), false);
  }
};

const assetStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const base = await storagePathsService.resolve("pluginUploadsPath");
      const dir  = path.join(base, "..", "plugin-assets");
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ts  = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${ts}-${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, name);
  },
});

const uploadIcon        = multer({ storage: assetStorage, fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } });
const uploadScreenshots = multer({ storage: assetStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * @param {object} opts
 * @param {object} opts.app          - Express app (used to read app.locals.pluginManager)
 * @param {object} [opts.prisma]     - Prisma client
 * @param {object} [opts.logger]
 * @returns {Router}
 */
module.exports = function buildMarketplaceRouter({ app, prisma, logger = console } = {}) {
  // ── Bootstrap services ──────────────────────────────────────────
  const marketplaceService = new PluginMarketplaceService({ prisma, logger });

  const pluginManagerProxy = {
    get pluginManager() { return app?.locals?.pluginManager ?? null; },
  };

  // Billing service (for purchase/revenue tracking)
  const billingService = new PluginBillingService({
    prisma,
    logger,
    pluginStats,
  });

  const installerService = new PluginInstallerService({
    marketplaceService,
    billingService,
    get pluginManager() { return app?.locals?.pluginManager ?? null; },
    logger,
  });

  const updateService = new PluginUpdateService({
    marketplaceService,
    installerService,
    get pluginManager() { return app?.locals?.pluginManager ?? null; },
    logger,
  });

  // ── Install Queue Service ────────────────────────────────────────
  const installQueue = new PluginInstallQueue({
    installerService,
    pluginStateService,
    logger,
  });

  const ctrl = new PluginMarketplaceController({
    marketplaceService,
    installerService,
    updateService,
    billingService,
    installQueue,
  });

  const router = Router();

  // ── Public routes (no auth) ─────────────────────────────────────
  router.get("/marketplace/plugins",                    ctrl.listMarketplacePlugins);
  router.get("/marketplace/plugins/:slug",              ctrl.getPluginBySlug);
  router.get("/marketplace/plugins/:slug/stats",        ctrl.getPluginStats);
  router.get("/marketplace/stats/top",                  ctrl.getTopPlugins);
  router.get("/marketplace/stats/most-installed",       ctrl.getMostInstalled);
  router.get("/marketplace/stats/highest-rated",        ctrl.getHighestRated);
  router.post("/marketplace/plugins/:slug/rate", authGuard, ctrl.submitRating);

  // ── Purchase (authenticated) ────────────────────────────────────
  router.post("/marketplace/plugins/:id/purchase", authGuard, ctrl.purchasePlugin);

  // ── Developer routes (must have developer role) ─────────────────
  router.post(
    "/developer/plugins",
    authGuard, developerPortalGuard,
    ctrl.createPlugin
  );

  router.get(
    "/developer/plugins",
    authGuard, developerPortalGuard,
    ctrl.listDeveloperPlugins
  );

  router.post(
    "/developer/plugins/:id/version",
    authGuard, developerPortalGuard,
    ctrl.submitPluginVersion
  );

  router.post(
    "/developer/plugins/:id/upload-zip",
    authGuard, developerPortalGuard,
    uploadZip.single("plugin"),
    ctrl.uploadPluginZip
  );

  router.post(
    "/developer/plugins/:id/icon",
    authGuard, developerPortalGuard,
    uploadIcon.single("icon"),
    ctrl.uploadPluginIcon
  );

  router.post(
    "/developer/plugins/:id/screenshots",
    authGuard, developerPortalGuard,
    uploadScreenshots.array("screenshots", 10),
    ctrl.uploadPluginScreenshots
  );

  router.patch(
    "/developer/plugins/:id/pricing",
    authGuard, developerPortalGuard,
    ctrl.updatePluginPricing
  );

  router.get(
    "/developer/plugins/:id/analytics",
    authGuard, developerPortalGuard,
    ctrl.getDeveloperAnalytics
  );

  // ── Admin routes — view/inspect (admin + superadmin) ────────────
  router.get(
    "/admin/plugins",
    authGuard, adminPortalGuard,
    ctrl.listPendingPlugins
  );

  // ── Superadmin-only — approve / reject ──────────────────────────
  router.post(
    "/admin/plugins/:id/approve",
    authGuard, superadminOnlyGuard,
    ctrl.approvePlugin
  );

  router.post(
    "/admin/plugins/:id/reject",
    authGuard, superadminOnlyGuard,
    ctrl.rejectPlugin
  );

  // ── Install route (admin / superadmin) ──────────────────────────
  router.post(
    "/plugins/install/:slug",
    authGuard, adminPortalGuard,
    ctrl.installPlugin
  );

  // ── Async Job Queue Routes (admin / superadmin) ──────────────────
  // Enqueue plugin installation (returns immediately with jobId)
  router.post(
    "/plugins/install/:slug/enqueue",
    authGuard, adminPortalGuard,
    ctrl.enqueueInstall
  );

  // Get job status (polling fallback)
  router.get(
    "/plugins/jobs/:jobId",
    authGuard, adminPortalGuard,
    ctrl.getJobStatus
  );

  // Subscribe to job events via SSE (Server-Sent Events)
  router.get(
    "/plugins/jobs/:jobId/events",
    authGuard, adminPortalGuard,
    ctrl.subscribeJobEvents
  );

  // ── Update routes (admin / superadmin) ──────────────────────────
  router.get(
    "/plugins/check-update/:slug",
    authGuard, adminPortalGuard,
    ctrl.checkForUpdates
  );

  router.post(
    "/plugins/update/:slug",
    authGuard, adminPortalGuard,
    ctrl.updatePlugin
  );

  // ── Reviews (admin) ─────────────────────────────────────────────
  router.get(
    "/admin/marketplace/reviews",
    authGuard, adminPortalGuard,
    ctrl.listReviews
  );

  router.delete(
    "/admin/marketplace/reviews/:id",
    authGuard, adminPortalGuard,
    ctrl.deleteReview
  );

  // ── Developer profile ────────────────────────────────────────────
  router.get(
    "/developer/profile",
    authGuard, developerPortalGuard,
    ctrl.getDeveloperProfile
  );

  router.patch(
    "/developer/profile",
    authGuard, developerPortalGuard,
    ctrl.updateDeveloperProfile
  );

  return router;
};
