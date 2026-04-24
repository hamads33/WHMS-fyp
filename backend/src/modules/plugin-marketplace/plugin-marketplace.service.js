/**
 * plugin-marketplace.service.js
 * ------------------------------------------------------------------
 * Core business logic for the plugin marketplace.
 *
 * Aligns marketplace records with the runtime plugin contract used by
 * backend/src/core/plugin-system by normalizing metadata like:
 *   - capabilities
 *   - permissions
 *   - ui.adminPages
 *   - plugin dependencies
 *
 * VERSION DATA: Stored directly on MarketplaceProduct
 * STATUS FLOW:
 *   draft -> submitted -> under_review -> approved | rejected
 */

const pluginState = require("../../core/plugin-system/plugin-state.service");

const STATUSES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
};

class PluginMarketplaceService {
  /**
   * @param {object} opts
   * @param {object} opts.prisma - Prisma client (required)
   * @param {object|Function} [opts.pluginManager] - PluginManager or getter
   * @param {object} [opts.logger]
   * @param {number} [opts.cacheMaxAge]
   */
  constructor({ prisma, pluginManager = null, logger = console, cacheMaxAge = 60000 } = {}) {
    if (!prisma) {
      throw new Error("PluginMarketplaceService requires a prisma client");
    }

    this.prisma = prisma;
    this.pluginManager = pluginManager;
    this.logger = logger;
    this.cacheMaxAge = cacheMaxAge;
    this._listingCache = {
      data: null,
      expiresAt: null,
    };
  }

  // ----------------------------------------------------------------
  // Plugins
  // ----------------------------------------------------------------

  async createPlugin({
    name,
    slug,
    description = "",
    author = null,
    capabilities = [],
    permissions = [],
    ui = null,
    pluginDependencies = null,
    ownerId = null,
    category = null,
    pricingType = "free",
    price = 0,
    currency = "USD",
    interval = null,
    visibility = "public",
  }) {
    try {
      const developerProfile = await this._resolveDeveloperProfile(ownerId, {
        createIfMissing: true,
        author,
      });

      const plugin = await this.prisma.marketplaceProduct.create({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description?.trim() || "",
          author: author?.trim() || developerProfile?.storeName || developerProfile?.displayName || null,
          devId: developerProfile.id,
          category,
          capabilities,
          permissions,
          ui,
          pluginDependencies,
          pluginMeta: {
            name: name.trim(),
            version: null,
            description: description?.trim() || "",
            capabilities,
            permissions,
            ui,
            pluginDependencies,
          },
          pricingType,
          price,
          currency,
          interval,
          visibility,
          status: STATUSES.DRAFT,
        },
      });

      this.logger.info(`[Marketplace] Plugin created: ${slug} (${plugin.id})`);
      return this.getPluginById(plugin.id);
    } catch (err) {
      if (err.code === "P2002" && err.meta?.target?.includes("slug")) {
        const error = new Error(`A plugin with slug "${slug}" already exists`);
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  async updatePluginAssets(pluginId, { iconUrl, screenshots = null, ownerId = null }) {
    const updateData = {};
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
    if (screenshots !== undefined) updateData.screenshots = screenshots;

    // Always validate ownership — required for security
    if (!ownerId) {
      throw new Error("ownerId is required for updatePluginAssets");
    }

    const existing = await this.prisma.marketplaceProduct.findUnique({
      where: { id: pluginId },
      include: { dev: true },
    });
    if (!existing) {
      const err = new Error(`Plugin not found: ${pluginId}`);
      err.statusCode = 404;
      throw err;
    }
    if (existing.dev?.userId !== ownerId) {
      const err = new Error("You do not own this plugin");
      err.statusCode = 403;
      throw err;
    }

    await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: updateData,
    });

    const plugin = await this.getPluginById(pluginId);
    this.logger.info(`[Marketplace] Plugin assets updated: ${plugin.slug}`);
    return plugin;
  }

  async updatePluginPricing(pluginId, { pricingType, price, currency = "USD", interval = null, ownerId = null }) {
    if (ownerId) {
      const existing = await this.prisma.marketplaceProduct.findUnique({
        where: { id: pluginId },
        include: { dev: true },
      });
      if (!existing) {
        const err = new Error(`Plugin not found: ${pluginId}`);
        err.statusCode = 404;
        throw err;
      }
      if (existing.dev?.userId !== ownerId) {
        const err = new Error("You do not own this plugin");
        err.statusCode = 403;
        throw err;
      }
    }

    await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: {
        pricingType,
        price,
        currency,
        interval,
      },
    });

    const plugin = await this.getPluginById(pluginId);
    this.logger.info(`[Marketplace] Plugin pricing updated: ${plugin.slug}`);
    return plugin;
  }

  async updatePluginMetadata(pluginId, data, { ownerId = null } = {}) {
    const existing = await this.prisma.marketplaceProduct.findUnique({
      where: { id: pluginId },
      include: { dev: true },
    });

    if (!existing) {
      const err = new Error(`Plugin not found: ${pluginId}`);
      err.statusCode = 404;
      throw err;
    }

    if (ownerId && existing.dev?.userId !== ownerId) {
      const err = new Error("You do not own this plugin");
      err.statusCode = 403;
      throw err;
    }

    const capabilities = data.capabilities ?? existing.capabilities ?? [];
    const permissions = data.permissions ?? existing.permissions ?? [];
    const ui = data.ui !== undefined ? data.ui : (existing.ui ?? null);
    const pluginDependencies = data.pluginDependencies !== undefined
      ? data.pluginDependencies
      : (existing.pluginDependencies ?? null);

    await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.author !== undefined ? { author: data.author } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
        ...(data.capabilities !== undefined ? { capabilities } : {}),
        ...(data.permissions !== undefined ? { permissions } : {}),
        ...(data.ui !== undefined ? { ui } : {}),
        ...(data.pluginDependencies !== undefined ? { pluginDependencies } : {}),
        pluginMeta: {
          ...(existing.pluginMeta && typeof existing.pluginMeta === "object" ? existing.pluginMeta : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          capabilities,
          permissions,
          ui,
          pluginDependencies,
        },
      },
    });

    const plugin = await this.getPluginById(pluginId);
    this.logger.info(`[Marketplace] Plugin metadata updated: ${plugin.slug}`);
    return plugin;
  }

  async listPluginsByOwner(ownerId) {
    const plugins = await this.prisma.marketplaceProduct.findMany({
      where: { dev: { userId: ownerId } },
      orderBy: { createdAt: "desc" },
      include: { dev: true },
    });
    return plugins.map((plugin) => this._formatPluginRecord(plugin));
  }

  async listAllPlugins() {
    const plugins = await this.prisma.marketplaceProduct.findMany({
      orderBy: { createdAt: "desc" },
      include: { dev: true },
    });
    return plugins.map((plugin) => this._formatPluginRecord(plugin));
  }

  async submitZipVersion(pluginId, { version, changelog = "", zipPath, ownerId }) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { id: pluginId },
      include: { dev: true },
    });

    if (!plugin) {
      const err = new Error(`Plugin not found: ${pluginId}`);
      err.statusCode = 404;
      throw err;
    }

    if (plugin.dev?.userId && ownerId && plugin.dev.userId !== ownerId) {
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
        pluginMeta: {
          ...(plugin.pluginMeta && typeof plugin.pluginMeta === "object" ? plugin.pluginMeta : {}),
          name: plugin.name,
          version: version.trim(),
          description: plugin.description || "",
          capabilities: plugin.capabilities ?? [],
          permissions: plugin.permissions ?? [],
          ui: plugin.ui ?? null,
          pluginDependencies: plugin.pluginDependencies ?? null,
        },
      },
    });

    this.logger.info(`[Marketplace] Zip version submitted: ${updated.slug} v${version}`);
    return this._formatVersionRecord(updated);
  }

  async submitPluginVersion(pluginId, { version, download_url, changelog = "", checksum = "", ownerId = null }) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { id: pluginId },
      include: { dev: true },
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

    if (plugin.dev?.userId && ownerId && plugin.dev.userId !== ownerId) {
      const err = new Error("You do not own this plugin");
      err.statusCode = 403;
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
        pluginMeta: {
          ...(plugin.pluginMeta && typeof plugin.pluginMeta === "object" ? plugin.pluginMeta : {}),
          name: plugin.name,
          version: version.trim(),
          description: plugin.description || "",
          capabilities: plugin.capabilities ?? [],
          permissions: plugin.permissions ?? [],
          ui: plugin.ui ?? null,
          pluginDependencies: plugin.pluginDependencies ?? null,
        },
      },
    });

    this.logger.info(`[Marketplace] Version submitted: ${updated.slug} v${version}`);
    return this._formatVersionRecord(updated);
  }

  async listMarketplacePlugins(filters = {}) {
    // Validate and sanitize filter inputs
    const validatedFilters = this._validateListingFilters(filters);
    const isUnfiltered = !validatedFilters.search && !validatedFilters.category && !validatedFilters.pricingType && !validatedFilters.minRating && !validatedFilters.capability;
    const now = Date.now();

    if (isUnfiltered && this._listingCache.data && this._listingCache.expiresAt > now) {
      this.logger.debug("[Marketplace] Returning cached plugin listing");
      return this._listingCache.data;
    }

    const plugins = await this.prisma.marketplaceProduct.findMany({
      where: {
        status: STATUSES.APPROVED,
        visibility: "public",
        ...(validatedFilters.search ? {
          OR: [
            { name: { contains: validatedFilters.search, mode: "insensitive" } },
            { slug: { contains: validatedFilters.search, mode: "insensitive" } },
            { description: { contains: validatedFilters.search, mode: "insensitive" } },
            { author: { contains: validatedFilters.search, mode: "insensitive" } },
          ],
        } : {}),
        ...(validatedFilters.category ? { category: validatedFilters.category } : {}),
        ...(validatedFilters.pricingType ? { pricingType: validatedFilters.pricingType } : {}),
        ...(validatedFilters.capability ? { capabilities: { has: validatedFilters.capability } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { dev: true },
    });

    let listing = plugins.map((plugin) => this._formatPluginRecord(plugin));
    if (validatedFilters.minRating) {
      listing = listing.filter((plugin) => Number(plugin.rating || 0) >= Number(validatedFilters.minRating));
    }

    if (isUnfiltered) {
      this._listingCache.data = listing;
      this._listingCache.expiresAt = now + this.cacheMaxAge;
      this.logger.debug(`[Marketplace] Cached plugin listing (expires in ${this.cacheMaxAge}ms)`);
    }

    return listing;
  }

  /**
   * _validateListingFilters
   * Validates and sanitizes filter parameters to prevent injection attacks.
   * @private
   */
  _validateListingFilters(filters = {}) {
    const validated = {};

    // Validate search (must be string, max 200 chars)
    if (filters.search) {
      if (typeof filters.search !== "string") {
        throw new Error("Invalid filter: search must be a string");
      }
      validated.search = filters.search.trim().slice(0, 200);
    }

    // Validate category (must be string, max 100 chars)
    if (filters.category) {
      if (typeof filters.category !== "string") {
        throw new Error("Invalid filter: category must be a string");
      }
      validated.category = filters.category.trim().slice(0, 100);
    }

    // Validate pricingType (must be one of: free, one-time, subscription)
    if (filters.pricingType) {
      const validPricingTypes = ["free", "one-time", "subscription"];
      if (!validPricingTypes.includes(filters.pricingType)) {
        throw new Error(`Invalid filter: pricingType must be one of ${validPricingTypes.join(", ")}`);
      }
      validated.pricingType = filters.pricingType;
    }

    // Validate capability (must be string, max 100 chars)
    if (filters.capability) {
      if (typeof filters.capability !== "string") {
        throw new Error("Invalid filter: capability must be a string");
      }
      validated.capability = filters.capability.trim().slice(0, 100);
    }

    // Validate minRating (must be number between 0-5)
    if (filters.minRating !== undefined) {
      const rating = Number(filters.minRating);
      if (isNaN(rating) || rating < 0 || rating > 5) {
        throw new Error("Invalid filter: minRating must be a number between 0 and 5");
      }
      validated.minRating = rating;
    }

    return validated;
  }

  async getPluginBySlug(slug) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { slug },
      include: { dev: true },
    });

    if (!plugin) {
      const err = new Error(`Plugin not found: ${slug}`);
      err.statusCode = 404;
      throw err;
    }

    return this._formatPluginRecord(plugin);
  }

  async getPluginById(id) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { id },
      include: { dev: true },
    });

    if (!plugin) {
      const err = new Error(`Plugin not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }

    return this._formatPluginRecord(plugin);
  }

  _invalidateListingCache() {
    this._listingCache.data = null;
    this._listingCache.expiresAt = null;
    this.logger.debug("[Marketplace] Listing cache invalidated");
  }

  async approvePlugin(pluginId) {
    await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: { status: STATUSES.APPROVED },
    });

    this._invalidateListingCache();
    const plugin = await this.getPluginById(pluginId);
    this.logger.info(`[Marketplace] Plugin approved: ${plugin.slug}`);
    return plugin;
  }

  async rejectPlugin(pluginId) {
    await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: { status: STATUSES.REJECTED },
    });

    this._invalidateListingCache();
    const plugin = await this.getPluginById(pluginId);
    this.logger.info(`[Marketplace] Plugin rejected: ${plugin.slug}`);
    return plugin;
  }

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

  async listReviews({ productId = null, limit = 50, offset = 0 } = {}) {
    const where = productId ? { productId } : {};
    return this.prisma.marketplaceReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async deleteReview(reviewId) {
    return this.prisma.marketplaceReview.delete({ where: { id: reviewId } });
  }

  // ----------------------------------------------------------------
  // Developer Profile
  // ----------------------------------------------------------------

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

  async upsertDeveloperProfile(userId, { displayName, website, github, payoutsEmail, storeName } = {}) {
    return this.prisma.developerProfile.upsert({
      where: { userId },
      update: { displayName, website, github, payoutsEmail, storeName },
      create: { userId, displayName, website, github, payoutsEmail, storeName },
    });
  }

  // ----------------------------------------------------------------
  // Private Helpers
  // ----------------------------------------------------------------

  async _resolveDeveloperProfile(userId, { createIfMissing = false, author = null } = {}) {
    if (!userId) {
      const err = new Error("Developer ownership is required");
      err.statusCode = 400;
      throw err;
    }

    let profile = await this.prisma.developerProfile.findUnique({
      where: { userId },
    });

    if (!profile && createIfMissing) {
      profile = await this.prisma.developerProfile.create({
        data: {
          userId,
          displayName: author?.trim() || null,
          storeName: author?.trim() || null,
        },
      });
    }

    if (!profile) {
      const err = new Error("Developer profile not found");
      err.statusCode = 404;
      throw err;
    }

    return profile;
  }

  _getPluginManager() {
    if (!this.pluginManager) return null;
    return typeof this.pluginManager === "function"
      ? this.pluginManager()
      : this.pluginManager;
  }

  _resolveRuntimePlugin(product) {
    const pm = this._getPluginManager();
    if (!pm || typeof pm.list !== "function") return null;

    const installed = pm.list();
    const candidates = [product.slug, product.name].filter(Boolean);
    const runtime = installed.find((plugin) => candidates.includes(plugin.name) || candidates.includes(plugin.slug));
    if (!runtime) return null;

    return {
      ...runtime,
      installed: true,
      enabled: pluginState.isEnabled(runtime.name),
      state: pluginState.getState(runtime.name),
      pluginDependencies: runtime.pluginDependencies ?? runtime.meta?.pluginDependencies ?? null,
    };
  }

  _formatPluginRecord(product) {
    if (!product) return null;

    const runtime = this._resolveRuntimePlugin(product);
    const rawMeta = product.pluginMeta && typeof product.pluginMeta === "object" ? product.pluginMeta : {};
    const capabilities = Array.isArray(product.capabilities) && product.capabilities.length
      ? product.capabilities
      : (runtime?.capabilities ?? rawMeta.capabilities ?? []);
    const permissions = Array.isArray(product.permissions) && product.permissions.length
      ? product.permissions
      : (runtime?.permissions ?? rawMeta.permissions ?? []);
    const ui = product.ui ?? runtime?.ui ?? rawMeta.ui ?? null;
    const pluginDependencies = product.pluginDependencies ?? runtime?.pluginDependencies ?? rawMeta.pluginDependencies ?? null;
    const developer = product.dev?.storeName || product.dev?.displayName || product.author || null;
    const rating = Number(product.rating?.toNumber?.() ?? product.rating ?? 0);
    const totalRevenue = Number(product.totalRevenue?.toNumber?.() ?? product.totalRevenue ?? 0);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      author: product.author || developer || product.name,
      developer,
      owner_id: product.devId,
      devId: product.devId,
      status: product.status,
      category: product.category,
      meta: {
        name: product.name,
        version: product.version || runtime?.version || null,
        description: product.description || "",
        capabilities,
        permissions,
        ui,
        pluginDependencies,
      },
      capabilities,
      permissions,
      ui,
      pluginDependencies,
      pricingType: product.pricingType,
      price: product.price,
      currency: product.currency,
      interval: product.interval,
      visibility: product.visibility,
      iconUrl: product.iconUrl,
      icon: product.iconUrl,
      screenshots: product.screenshots || [],
      rating,
      totalRevenue,
      salesCount: product.salesCount,
      downloads: product.salesCount,
      installed: runtime?.installed || false,
      enabled: runtime?.enabled || false,
      runtimeState: runtime?.state || "not_installed",
      installedVersion: runtime?.version || null,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      version: product.version,
      changelog: product.changelog || "",
      zipPath: product.zipPath,
      downloadUrl: product.downloadUrl,
      checksum: product.checksum,
    };
  }

  _formatVersionRecord(product) {
    if (!product) return null;

    return {
      id: product.id,
      plugin_id: product.id,
      version: product.version || "1.0.0",
      changelog: product.changelog || "",
      download_url: product.downloadUrl,
      zip_path: product.zipPath,
      checksum: product.checksum || "",
      created_at: product.updatedAt.toISOString(),
      original_name: null,
    };
  }
}

module.exports = PluginMarketplaceService;
