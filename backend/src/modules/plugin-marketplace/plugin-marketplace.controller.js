/**
 * plugin-marketplace.controller.js
 * ------------------------------------------------------------------
 * Thin HTTP layer. Validates input, delegates to services, returns JSON.
 * No business logic lives here.
 */

const {
  validateCreatePlugin,
  validateSubmitVersion,
  validateUpdatePlugin,
} = require("./plugin-marketplace.validation");
const pluginStats = require("./plugin-stats.service");

class PluginMarketplaceController {
  /**
   * @param {object} opts
   * @param {object} opts.marketplaceService  - PluginMarketplaceService
   * @param {object} opts.installerService    - PluginInstallerService
   * @param {object} opts.updateService       - PluginUpdateService
   * @param {object} [opts.billingService]    - PluginBillingService
   * @param {object} [opts.installQueue]      - PluginInstallQueue
   */
  constructor({ marketplaceService, installerService, updateService, billingService = null, installQueue = null }) {
    this.marketplace     = marketplaceService;
    this.installer       = installerService;
    this.updater         = updateService;
    this.billingService  = billingService;
    this.installQueue    = installQueue;

    // Bind all methods so they can be used directly as route handlers
    this.createPlugin            = this.createPlugin.bind(this);
    this.submitPluginVersion     = this.submitPluginVersion.bind(this);
    this.uploadPluginZip         = this.uploadPluginZip.bind(this);
    this.listMarketplacePlugins  = this.listMarketplacePlugins.bind(this);
    this.listDeveloperPlugins    = this.listDeveloperPlugins.bind(this);
    this.getDeveloperPlugin      = this.getDeveloperPlugin.bind(this);
    this.updateDeveloperPlugin   = this.updateDeveloperPlugin.bind(this);
    this.getPluginBySlug         = this.getPluginBySlug.bind(this);
    this.approvePlugin           = this.approvePlugin.bind(this);
    this.rejectPlugin            = this.rejectPlugin.bind(this);
    this.listPendingPlugins      = this.listPendingPlugins.bind(this);
    this.installPlugin           = this.installPlugin.bind(this);
    this.enqueueInstall          = this.enqueueInstall.bind(this);
    this.getJobStatus            = this.getJobStatus.bind(this);
    this.subscribeJobEvents      = this.subscribeJobEvents.bind(this);
    this.getPluginStats          = this.getPluginStats.bind(this);
    this.getTopPlugins           = this.getTopPlugins.bind(this);
    this.getMostInstalled        = this.getMostInstalled.bind(this);
    this.getHighestRated         = this.getHighestRated.bind(this);
    this.submitRating            = this.submitRating.bind(this);
    this.checkForUpdates         = this.checkForUpdates.bind(this);
    this.updatePlugin            = this.updatePlugin.bind(this);
    this.uploadPluginIcon        = this.uploadPluginIcon.bind(this);
    this.uploadPluginScreenshots = this.uploadPluginScreenshots.bind(this);
    this.updatePluginPricing     = this.updatePluginPricing.bind(this);
    this.purchasePlugin          = this.purchasePlugin.bind(this);
    this.getDeveloperAnalytics   = this.getDeveloperAnalytics.bind(this);
    this.listReviews             = this.listReviews.bind(this);
    this.deleteReview            = this.deleteReview.bind(this);
    this.getDeveloperProfile     = this.getDeveloperProfile.bind(this);
    this.updateDeveloperProfile  = this.updateDeveloperProfile.bind(this);
  }

  // ----------------------------------------------------------------
  // Developer / Public
  // ----------------------------------------------------------------

  /**
   * POST /api/marketplace/plugins
   */
  async createPlugin(req, res) {
    const validation = validateCreatePlugin(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    try {
      const plugin = await this.marketplace.createPlugin({
        ...validation.normalized,
        pricingType: req.body.pricingType,
        price: req.body.price,
        currency: req.body.currency,
        interval: req.body.interval,
        ownerId: req.user?.id || null,
      });
      return res.status(201).json({ success: true, data: plugin });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/developer/plugins  — list only plugins owned by this developer
   */
  async listDeveloperPlugins(req, res) {
    try {
      const userId = req.user.id;
      const plugins = await this.marketplace.listPluginsByOwner(userId);
      return res.json({ success: true, data: plugins });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/developer/plugins/:id
   */
  async getDeveloperPlugin(req, res) {
    try {
      const plugin = await this.marketplace.getPluginById(req.params.id);
      const ownedPlugins = await this.marketplace.listPluginsByOwner(req.user.id);
      const isOwner = ownedPlugins.some((entry) => entry.id === plugin.id);

      if (!isOwner) {
        return res.status(403).json({ success: false, message: "Unauthorized — you do not own this plugin" });
      }

      return res.json({ success: true, data: plugin });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/developer/plugins/:id
   */
  async updateDeveloperPlugin(req, res) {
    const validation = validateUpdatePlugin(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    try {
      const plugin = await this.marketplace.updatePluginMetadata(
        req.params.id,
        validation.normalized,
        { ownerId: req.user.id }
      );
      return res.json({ success: true, data: plugin });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/marketplace/plugins/:id/version
   */
  async submitPluginVersion(req, res) {
    const validation = validateSubmitVersion(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    try {
      const version = await this.marketplace.submitPluginVersion(req.params.id, {
        ...req.body,
        ownerId: req.user.id,
      });
      return res.status(201).json({ success: true, data: version });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/marketplace/plugins
   */
  async listMarketplacePlugins(req, res) {
    try {
      const plugins = await this.marketplace.listMarketplacePlugins({
        search: req.query.search,
        category: req.query.category,
        pricingType: req.query.pricingType,
        minRating: req.query.minRating,
        capability: req.query.capability,
      });
      return res.json({ success: true, data: plugins });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/marketplace/plugins/:slug
   */
  async getPluginBySlug(req, res) {
    try {
      const plugin = await this.marketplace.getPluginBySlug(req.params.slug);
      return res.json({ success: true, data: plugin });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/marketplace/plugins/:id/upload-zip
   * Expects multipart/form-data with field "plugin" (zip file)
   */
  async uploadPluginZip(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No zip file uploaded. Use field name 'plugin'." });
      }

      const { id } = req.params;
      const { version, changelog } = req.body;

      if (!version) {
        return res.status(400).json({ success: false, message: "version is required" });
      }

      const result = await this.marketplace.submitZipVersion(id, {
        version,
        changelog,
        zipPath: req.file.path,
        originalName: req.file.originalname,
        ownerId: req.user.id,
      });

      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // ----------------------------------------------------------------
  // Admin
  // ----------------------------------------------------------------

  /**
   * GET /api/admin/plugins — list all plugins with any status for review
   */
  async listPendingPlugins(req, res) {
    try {
      const plugins = await this.marketplace.listAllPlugins();
      return res.json({ success: true, data: plugins });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/admin/plugins/:id/approve
   */
  async approvePlugin(req, res) {
    try {
      const plugin = await this.marketplace.approvePlugin(req.params.id, req.body?.approval_notes);
      return res.json({ success: true, data: plugin });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/admin/plugins/:id/reject
   * Body: { reject_reason? }
   */
  async rejectPlugin(req, res) {
    try {
      const plugin = await this.marketplace.rejectPlugin(req.params.id, req.body?.reject_reason);
      return res.json({ success: true, data: plugin });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // ----------------------------------------------------------------
  // Installation
  // ----------------------------------------------------------------

  /**
   * POST /api/plugins/install/:slug
   * Synchronous install (deprecated, kept for backward compatibility).
   */
  async installPlugin(req, res) {
    try {
      const result = await this.installer.installPlugin(req.params.slug);
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/plugins/install/:slug/enqueue
   * Async job queue: enqueue installation and return immediately with jobId.
   */
  async enqueueInstall(req, res) {
    if (!this.installQueue) {
      return res.status(503).json({ success: false, message: "Install queue not available" });
    }

    try {
      const { jobId } = this.installQueue.enqueue(req.params.slug);
      return res.json({ success: true, data: { jobId } });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/plugins/jobs/:jobId
   * Polling endpoint: get current job status (alternative to SSE).
   */
  async getJobStatus(req, res) {
    if (!this.installQueue) {
      return res.status(503).json({ success: false, message: "Install queue not available" });
    }

    try {
      const job = this.installQueue.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }
      return res.json({ success: true, data: job });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/plugins/jobs/:jobId/events
   * Server-Sent Events (SSE) streaming for real-time job progress.
   */
  async subscribeJobEvents(req, res) {
    if (!this.installQueue) {
      return res.status(503).json({ success: false, message: "Install queue not available" });
    }

    try {
      this.installQueue.subscribe(req.params.jobId, res);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ----------------------------------------------------------------
  // Updates
  // ----------------------------------------------------------------

  /** GET /api/plugins/check-update/:slug */
  async checkForUpdates(req, res) {
    try {
      const result = await this.updater.checkForUpdates(req.params.slug);
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /** POST /api/plugins/update/:slug */
  async updatePlugin(req, res) {
    try {
      const result = await this.updater.updatePlugin(req.params.slug);
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // ----------------------------------------------------------------
  // Stats
  // ----------------------------------------------------------------

  /** GET /api/marketplace/plugins/:slug/stats */
  getPluginStats(req, res) {
    return res.json({ success: true, data: pluginStats.getPluginStats(req.params.slug) });
  }

  /** GET /api/marketplace/stats/top */
  getTopPlugins(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    return res.json({ success: true, data: pluginStats.getTopPlugins(limit) });
  }

  /** GET /api/marketplace/stats/most-installed */
  getMostInstalled(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    return res.json({ success: true, data: pluginStats.getMostInstalledPlugins(limit) });
  }

  /** GET /api/marketplace/stats/highest-rated */
  getHighestRated(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    return res.json({ success: true, data: pluginStats.getHighestRatedPlugins(limit) });
  }

  /** POST /api/marketplace/plugins/:slug/rate  — body: { rating: 1-5 } */
  submitRating(req, res) {
    const rating = Number(req.body?.rating);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "rating must be a number between 1 and 5" });
    }
    pluginStats.recordRating(req.params.slug, rating);
    return res.json({ success: true, data: pluginStats.getPluginStats(req.params.slug) });
  }

  // ----------------------------------------------------------------
  // Assets (New)
  // ----------------------------------------------------------------

  /**
   * POST /api/developer/plugins/:id/icon
   * Upload plugin icon image (single file, via multer)
   */
  async uploadPluginIcon(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No icon file uploaded. Use field name 'icon'." });
      }

      const { id } = req.params;
      const iconUrl = `/uploads/plugin-assets/${req.file.filename}`;

      const plugin = await this.marketplace.updatePluginAssets(id, { iconUrl, ownerId: req.user.id });
      return res.status(200).json({ success: true, data: plugin, iconUrl });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/developer/plugins/:id/screenshots
   * Upload plugin screenshots (multiple files, via multer, field name 'screenshots')
   */
  async uploadPluginScreenshots(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "No screenshot files uploaded. Use field name 'screenshots'." });
      }

      const { id } = req.params;
      const screenshots = req.files.map((file) => `/uploads/plugin-assets/${file.filename}`);

      const plugin = await this.marketplace.updatePluginAssets(id, { screenshots, ownerId: req.user.id });
      return res.status(200).json({ success: true, data: plugin, screenshots });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/developer/plugins/:id/pricing
   * Update plugin pricing info
   * Body: { pricingType, price, currency?, interval? }
   */
  async updatePluginPricing(req, res) {
    try {
      const { id } = req.params;
      const { pricingType, price, currency = "USD", interval } = req.body;

      if (!pricingType) {
        return res.status(400).json({ success: false, message: "pricingType is required" });
      }

      if (pricingType !== "free" && !price) {
        return res.status(400).json({ success: false, message: "price is required for paid plugins" });
      }

      const plugin = await this.marketplace.updatePluginPricing(id, {
        pricingType,
        price: pricingType === "free" ? 0 : price,
        currency,
        interval: pricingType === "subscription" ? interval : null,
        ownerId: req.user.id,
      });

      return res.json({ success: true, data: plugin });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // ----------------------------------------------------------------
  // Billing / Purchase (New)
  // ----------------------------------------------------------------

  /**
   * POST /api/marketplace/plugins/:id/purchase
   * Simulated purchase endpoint (no real payment gateway)
   * Creates a purchase record after simulated payment
   */
  async purchasePlugin(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!this.billingService) {
        return res.status(500).json({ success: false, message: "Billing service not available" });
      }

      // Get plugin to check pricing
      const plugin = await this.marketplace.getPluginById(id);

      if (plugin.pricingType === "free") {
        return res.status(400).json({ success: false, message: "Cannot purchase a free plugin" });
      }

      // Create purchase record
      const purchase = await this.billingService.createPurchase(userId, id, plugin.price, plugin.currency);

      return res.status(201).json({
        success: true,
        data: purchase,
        message: `Successfully purchased ${plugin.name}`,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // ----------------------------------------------------------------
  // Developer Analytics (New)
  // ----------------------------------------------------------------

  /**
   * GET /api/developer/plugins/:id/analytics
   * Returns analytics for a plugin (installs, revenue, ratings, growth)
   */
  async getDeveloperAnalytics(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get plugin and verify ownership
      const plugin = await this.marketplace.getPluginById(id);
      const ownedPlugins = await this.marketplace.listPluginsByOwner(userId);
      const isOwner = ownedPlugins.some((entry) => entry.id === plugin.id);
      if (!isOwner) {
        return res.status(403).json({ success: false, message: "Unauthorized — you do not own this plugin" });
      }

      // Combine stats
      const stats = pluginStats.getPluginStats(id);

      // Get revenue summary from billing
      let revenueSummary = { totalRevenue: 0, salesCount: 0 };
      if (this.billingService) {
        try {
          revenueSummary = await this.billingService.getRevenueSummary(id);
          const salesHistory = await this.billingService.getPluginSalesStats(id, 12);

          return res.json({
            success: true,
            data: {
              pluginId: id,
              pluginName: plugin.name,
              installs: stats.install_count || 0,
              activeInstalls: stats.active_install_count || 0,
              revenue: revenueSummary.totalRevenue || 0,
              sales: revenueSummary.salesCount || 0,
              rating: stats.average_rating || 0,
              reviewCount: stats.review_count || 0,
              lastInstalledAt: stats.last_installed_at,
              growth_over_time: salesHistory,
            },
          });
        } catch (err) {
          // If billing service fails, return partial stats
          return res.json({
            success: true,
            data: {
              pluginId: id,
              pluginName: plugin.name,
              installs: stats.install_count || 0,
              activeInstalls: stats.active_install_count || 0,
              revenue: stats.total_revenue || 0,
              sales: stats.sales_count || 0,
              rating: stats.average_rating || 0,
              reviewCount: stats.review_count || 0,
              lastInstalledAt: stats.last_installed_at,
              growth_over_time: [],
            },
          });
        }
      }

      return res.json({
        success: true,
        data: {
          pluginId: id,
          pluginName: plugin.name,
          installs: stats.install_count || 0,
          activeInstalls: stats.active_install_count || 0,
          revenue: stats.total_revenue || 0,
          sales: stats.sales_count || 0,
          rating: stats.average_rating || 0,
          reviewCount: stats.review_count || 0,
          lastInstalledAt: stats.last_installed_at,
          growth_over_time: [],
        },
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
  // ----------------------------------------------------------------
  // Reviews (Admin)
  // ----------------------------------------------------------------

  /** GET /api/admin/marketplace/reviews */
  async listReviews(req, res) {
    try {
      const { productId, limit = 50, offset = 0 } = req.query;
      const reviews = await this.marketplace.listReviews({ productId, limit: +limit, offset: +offset });
      return res.json({ success: true, data: reviews, count: reviews.length });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /** DELETE /api/admin/marketplace/reviews/:id */
  async deleteReview(req, res) {
    try {
      await this.marketplace.deleteReview(req.params.id);
      return res.json({ success: true, message: "Review deleted" });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  // ----------------------------------------------------------------
  // Developer Profile
  // ----------------------------------------------------------------

  /** GET /api/developer/profile */
  async getDeveloperProfile(req, res) {
    try {
      const profile = await this.marketplace.getDeveloperProfile(req.user.id);
      return res.json({ success: true, data: profile });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /** PATCH /api/developer/profile */
  async updateDeveloperProfile(req, res) {
    try {
      const { displayName, website, github, payoutsEmail, storeName } = req.body;
      const profile = await this.marketplace.upsertDeveloperProfile(req.user.id, {
        displayName, website, github, payoutsEmail, storeName,
      });
      return res.json({ success: true, data: profile });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = PluginMarketplaceController;
