/**
 * plugin-marketplace.service.js
 * ------------------------------------------------------------------
 * Core business logic for the plugin marketplace.
 *
 * Now uses Prisma for persistent storage.
 * VERSION DATA: Stored directly on MarketplaceProduct (zipPath, downloadUrl, version, changelog, checksum)
 *
 * STATUS FLOW:
 *   draft → submitted → under_review → approved | rejected
 */

const STATUSES = {
  DRAFT        : "draft",
  SUBMITTED    : "submitted",
  UNDER_REVIEW : "under_review",
  APPROVED     : "approved",
  REJECTED     : "rejected",
};

class PluginMarketplaceService {
  /**
   * @param {object} opts
   * @param {object} opts.prisma - Prisma client (required)
   * @param {object} [opts.logger]
   * @param {number} [opts.cacheMaxAge] - Max age of listing cache in ms (default: 60000ms = 60s)
   */
  constructor({ prisma, logger = console, cacheMaxAge = 60000 } = {}) {
    if (!prisma) {
      throw new Error("PluginMarketplaceService requires a prisma client");
    }
    this.prisma = prisma;
    this.logger = logger;
    this.cacheMaxAge = cacheMaxAge;

    // Simple TTL cache for marketplace listing
    this._listingCache = {
      data: null,
      expiresAt: null,
    };
  }

  // ----------------------------------------------------------------
  // Plugins
  // ----------------------------------------------------------------

  /**
   * createPlugin
   * Creates a new plugin entry in draft status.
   *
   * @param {{ name, slug, description, author, ownerId, category, pricingType, price, currency, interval, visibility }} data
   * @returns {Promise<object>} plugin record
   */
  async createPlugin({
    name,
    slug,
    description = "",
    author,
    ownerId = null,
    category = null,
    pricingType = "free",
    price = 0,
    currency = "USD",
    interval = null,
    visibility = "public",
  }) {
    try {
      const plugin = await this.prisma.marketplaceProduct.create({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || "",
          devId: ownerId,
          category,
          pricingType,
          price,
          currency,
          interval,
          visibility,
          status: STATUSES.DRAFT,
        },
      });

      this.logger.info(`[Marketplace] Plugin created: ${slug} (${plugin.id})`);
      return this._formatPluginRecord(plugin);
    } catch (err) {
      if (err.code === "P2002" && err.meta?.target?.includes("slug")) {
        const error = new Error(`A plugin with slug "${slug}" already exists`);
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  /**
   * updatePluginAssets
   * Updates icon and screenshots for a plugin.
   */
  async updatePluginAssets(pluginId, { iconUrl, screenshots = null }) {
    const updateData = {};
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
    if (screenshots !== undefined) updateData.screenshots = screenshots;

    const plugin = await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: updateData,
    });

    this.logger.info(`[Marketplace] Plugin assets updated: ${plugin.slug}`);
    return this._formatPluginRecord(plugin);
  }

  /**
   * updatePluginPricing
   * Updates pricing for a plugin.
   */
  async updatePluginPricing(pluginId, { pricingType, price, currency = "USD", interval = null }) {
    const plugin = await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: {
        pricingType,
        price,
        currency,
        interval,
      },
    });

    this.logger.info(`[Marketplace] Plugin pricing updated: ${plugin.slug}`);
    return this._formatPluginRecord(plugin);
  }

  /**
   * listPluginsByOwner
   * Returns all plugins belonging to a specific developer user.
   */
  async listPluginsByOwner(ownerId) {
    const plugins = await this.prisma.marketplaceProduct.findMany({
      where: { devId: ownerId },
      orderBy: { createdAt: "desc" },
    });
    return plugins.map((p) => this._formatPluginRecord(p));
  }

  /**
   * listAllPlugins
   * Returns all plugins regardless of status (admin view).
   */
  async listAllPlugins() {
    const plugins = await this.prisma.marketplaceProduct.findMany({
      orderBy: { createdAt: "desc" },
    });
    return plugins.map((p) => this._formatPluginRecord(p));
  }

  /**
   * submitZipVersion
   * Updates version fields on the plugin and moves status to submitted.
   */
  async submitZipVersion(pluginId, { version, changelog = "", zipPath, originalName, ownerId }) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { id: pluginId },
    });

    if (!plugin) {
      const err = new Error(`Plugin not found: ${pluginId}`);
      err.statusCode = 404;
      throw err;
    }

    // Only the owner may submit versions
    if (plugin.devId && ownerId && plugin.devId !== ownerId) {
      const err = new Error("You do not own this plugin");
      err.statusCode = 403;
      throw err;
    }

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: {
        version: version.trim(),
        changelog: changelog?.trim() || "",
        zipPath,
        status: STATUSES.SUBMITTED,
      },
    });

    this.logger.info(`[Marketplace] Zip version submitted: ${updated.slug} v${version}`);

    // Return in version record format for backward compatibility
    return this._formatVersionRecord(updated);
  }

  /**
   * submitPluginVersion
   * Updates version fields on the plugin and moves status to submitted.
   *
   * @param {string} pluginId
   * @param {{ version, download_url, changelog, checksum }} data
   * @returns {Promise<object>} version record
   */
  async submitPluginVersion(pluginId, { version, download_url, changelog = "", checksum = "" }) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { id: pluginId },
    });

    if (!plugin) {
      const err = new Error(`Plugin not found: ${pluginId}`);
      err.statusCode = 404;
      throw err;
    }

    if (plugin.status === STATUSES.APPROVED) {
      const err = new Error("Cannot submit a new version while plugin is approved — create a new draft first");
      err.statusCode = 400;
      throw err;
    }

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: {
        version: version.trim(),
        changelog: changelog?.trim() || "",
        downloadUrl: download_url.trim(),
        checksum: checksum?.trim() || "",
        status: STATUSES.SUBMITTED,
      },
    });

    this.logger.info(`[Marketplace] Version submitted: ${updated.slug} v${version}`);
    return this._formatVersionRecord(updated);
  }

  /**
   * listMarketplacePlugins
   * Returns all approved plugins (public listing).
   * Results are cached for 60 seconds to reduce computation.
   *
   * @returns {Promise<object[]>}
   */
  async listMarketplacePlugins() {
    const now = Date.now();

    // Return cached result if still valid
    if (this._listingCache.data && this._listingCache.expiresAt > now) {
      this.logger.debug("[Marketplace] Returning cached plugin listing");
      return this._listingCache.data;
    }

    // Compute fresh listing
    const plugins = await this.prisma.marketplaceProduct.findMany({
      where: {
        status: STATUSES.APPROVED,
        visibility: "public",
      },
      orderBy: { createdAt: "desc" },
    });

    const listing = plugins.map((p) => this._formatPluginRecord(p));

    // Cache it
    this._listingCache.data = listing;
    this._listingCache.expiresAt = now + this.cacheMaxAge;

    this.logger.debug(`[Marketplace] Cached plugin listing (expires in ${this.cacheMaxAge}ms)`);
    return listing;
  }

  /**
   * getPluginBySlug
   * Returns a single plugin by slug (any status — callers filter if needed).
   *
   * @param {string} slug
   * @returns {Promise<object>}
   */
  async getPluginBySlug(slug) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { slug },
    });

    if (!plugin) {
      const err = new Error(`Plugin not found: ${slug}`);
      err.statusCode = 404;
      throw err;
    }

    return this._formatPluginRecord(plugin);
  }

  /**
   * getPluginById
   * Returns a single plugin by id.
   */
  async getPluginById(id) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { id },
    });

    if (!plugin) {
      const err = new Error(`Plugin not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }

    return this._formatPluginRecord(plugin);
  }

  /**
   * _invalidateListingCache
   * Clear the marketplace listing cache.
   * Called whenever plugins are approved/rejected.
   *
   * @private
   */
  _invalidateListingCache() {
    this._listingCache.data = null;
    this._listingCache.expiresAt = null;
    this.logger.debug("[Marketplace] Listing cache invalidated");
  }

  /**
   * approvePlugin
   * Admin action — marks plugin as approved.
   *
   * @param {string} pluginId
   * @param {string} [approvalNotes]
   * @returns {Promise<object>} updated plugin
   */
  async approvePlugin(pluginId, approvalNotes = "") {
    const plugin = await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: {
        status: STATUSES.APPROVED,
      },
    });

    this._invalidateListingCache();
    this.logger.info(`[Marketplace] Plugin approved: ${plugin.slug}`);
    return this._formatPluginRecord(plugin);
  }

  /**
   * rejectPlugin
   * Admin action — marks plugin as rejected.
   *
   * @param {string} pluginId
   * @param {string} [rejectReason]
   * @returns {Promise<object>} updated plugin
   */
  async rejectPlugin(pluginId, rejectReason = "") {
    const plugin = await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: {
        status: STATUSES.REJECTED,
      },
    });

    this._invalidateListingCache();
    this.logger.info(`[Marketplace] Plugin rejected: ${plugin.slug}`);
    return this._formatPluginRecord(plugin);
  }

  /**
   * getApprovedVersion
   * Returns the version info for an approved plugin.
   * Throws if plugin is not approved or has no version submitted.
   *
   * @param {string} slug
   * @returns {Promise<object>} version record (formatted from plugin)
   */
  async getApprovedVersion(slug) {
    const plugin = await this.getPluginBySlug(slug);

    if (plugin.status !== STATUSES.APPROVED) {
      const err = new Error(`Plugin "${slug}" is not approved (status: ${plugin.status})`);
      err.statusCode = 400;
      throw err;
    }

    if (!plugin.version) {
      const err = new Error(`Plugin "${slug}" has no versions submitted`);
      err.statusCode = 404;
      throw err;
    }

    return this._formatVersionRecord(plugin);
  }

  // ----------------------------------------------------------------
  // Reviews
  // ----------------------------------------------------------------

  /**
   * listReviews
   * Returns all marketplace reviews (admin view), optionally filtered by product.
   */
  async listReviews({ productId = null, limit = 50, offset = 0 } = {}) {
    const where = productId ? { productId } : {};
    const reviews = await this.prisma.marketplaceReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });
    return reviews;
  }

  /**
   * deleteReview
   * Removes a review by ID (admin moderation).
   */
  async deleteReview(reviewId) {
    return this.prisma.marketplaceReview.delete({ where: { id: reviewId } });
  }

  // ----------------------------------------------------------------
  // Developer Profile
  // ----------------------------------------------------------------

  /**
   * getDeveloperProfile
   * Returns the developer profile for a given userId.
   */
  async getDeveloperProfile(userId) {
    const profile = await this.prisma.developerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      const err = new Error("Developer profile not found");
      err.statusCode = 404;
      throw err;
    }
    return profile;
  }

  /**
   * upsertDeveloperProfile
   * Creates or updates the developer profile for a given userId.
   */
  async upsertDeveloperProfile(userId, { displayName, website, github, payoutsEmail, storeName } = {}) {
    const profile = await this.prisma.developerProfile.upsert({
      where: { userId },
      update: { displayName, website, github, payoutsEmail, storeName },
      create: { userId, displayName, website, github, payoutsEmail, storeName },
    });
    return profile;
  }

  // ----------------------------------------------------------------
  // Private Helpers
  // ----------------------------------------------------------------

  /**
   * _formatPluginRecord
   * Converts a Prisma MarketplaceProduct to the expected plugin format.
   * Maps snake_case field names for backward compatibility.
   */
  _formatPluginRecord(product) {
    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      author: product.name, // Use name as author if not set separately
      owner_id: product.devId,
      devId: product.devId,
      status: product.status,
      category: product.category,
      pricingType: product.pricingType,
      price: product.price,
      currency: product.currency,
      interval: product.interval,
      visibility: product.visibility,
      iconUrl: product.iconUrl,
      screenshots: product.screenshots || [],
      totalRevenue: product.totalRevenue?.toNumber?.() || 0,
      salesCount: product.salesCount,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // Version fields
      version: product.version,
      changelog: product.changelog || "",
      zipPath: product.zipPath,
      downloadUrl: product.downloadUrl,
      checksum: product.checksum,
    };
  }

  /**
   * _formatVersionRecord
   * Converts a Prisma MarketplaceProduct to version record format.
   */
  _formatVersionRecord(product) {
    if (!product) return null;

    return {
      id: product.id, // Use product ID as version record ID
      plugin_id: product.id,
      version: product.version || "1.0.0",
      changelog: product.changelog || "",
      download_url: product.downloadUrl,
      zip_path: product.zipPath,
      checksum: product.checksum || "",
      created_at: product.updatedAt.toISOString(),
      original_name: null, // Not stored separately in new schema
    };
  }
}

module.exports = PluginMarketplaceService;
