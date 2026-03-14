/**
 * plugin-billing.service.js
 * ------------------------------------------------------------------
 * Handles plugin purchase records and billing-related operations.
 *
 * Supports:
 *   - Recording purchases (creates MarketplacePurchase records)
 *   - Checking if a user purchased a plugin
 *   - Getting revenue summary for a plugin
 */

class PluginBillingService {
  /**
   * @param {object} opts
   * @param {object} opts.prisma - Prisma client (required)
   * @param {object} [opts.logger]
   * @param {object} [opts.pluginStats] - Optional reference to PluginStatsService
   */
  constructor({ prisma, logger = console, pluginStats = null } = {}) {
    if (!prisma) {
      throw new Error("PluginBillingService requires a prisma client");
    }
    this.prisma = prisma;
    this.logger = logger;
    this.pluginStats = pluginStats;
  }

  /**
   * createPurchase
   * Creates a purchase record and updates plugin revenue/sales count.
   * Idempotent: if user already purchased this plugin, returns existing purchase.
   *
   * @param {string} userId - User ID
   * @param {string} pluginId - Plugin ID
   * @param {number} price - Price in cents
   * @param {string} [currency] - Currency code (default: USD)
   * @returns {Promise<object>} purchase record
   */
  async createPurchase(userId, pluginId, price, currency = "USD") {
    // Check if already purchased (idempotency)
    const existing = await this.prisma.marketplacePurchase.findFirst({
      where: {
        userId,
        productId: pluginId,
        status: "completed",
      },
    });

    if (existing) {
      this.logger.debug(`[Billing] Purchase already exists: ${userId} → ${pluginId}`);
      return existing;
    }

    // Create purchase record
    const purchase = await this.prisma.marketplacePurchase.create({
      data: {
        userId,
        productId: pluginId,
        price,
        currency,
        status: "completed",
      },
    });

    this.logger.info(`[Billing] Purchase created: ${userId} → ${pluginId} (${price / 100} ${currency})`);

    // Update plugin revenue and sales count
    await this.prisma.marketplaceProduct.update({
      where: { id: pluginId },
      data: {
        totalRevenue: {
          increment: price / 100, // Convert cents to dollars for Decimal field
        },
        salesCount: {
          increment: 1,
        },
      },
    });

    // Record sale in plugin stats if available
    if (this.pluginStats) {
      try {
        this.pluginStats.recordSale(pluginId, price);
      } catch (err) {
        this.logger.warn(`[Billing] Failed to record sale in stats: ${err.message}`);
      }
    }

    return purchase;
  }

  /**
   * hasPurchased
   * Checks if a user has purchased a specific plugin.
   *
   * @param {string} userId
   * @param {string} pluginId
   * @returns {Promise<boolean>}
   */
  async hasPurchased(userId, pluginId) {
    const purchase = await this.prisma.marketplacePurchase.findFirst({
      where: {
        userId,
        productId: pluginId,
        status: "completed",
      },
    });

    return !!purchase;
  }

  /**
   * getRevenueSummary
   * Returns total revenue and sales count for a plugin.
   *
   * @param {string} pluginId
   * @returns {Promise<{ totalRevenue: number, salesCount: number }>}
   */
  async getRevenueSummary(pluginId) {
    const plugin = await this.prisma.marketplaceProduct.findUnique({
      where: { id: pluginId },
      select: {
        totalRevenue: true,
        salesCount: true,
      },
    });

    if (!plugin) {
      const err = new Error(`Plugin not found: ${pluginId}`);
      err.statusCode = 404;
      throw err;
    }

    return {
      totalRevenue: plugin.totalRevenue?.toNumber?.() || 0,
      salesCount: plugin.salesCount,
    };
  }

  /**
   * getUserPurchases
   * Returns all plugins purchased by a user.
   *
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  async getUserPurchases(userId) {
    const purchases = await this.prisma.marketplacePurchase.findMany({
      where: {
        userId,
        status: "completed",
      },
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return purchases;
  }

  /**
   * getPluginPurchaseHistory
   * Returns all purchases for a specific plugin (for analytics).
   *
   * @param {string} pluginId
   * @param {object} [options]
   * @param {number} [options.limit] - Max results
   * @param {number} [options.skip] - Pagination offset
   * @returns {Promise<object[]>}
   */
  async getPluginPurchaseHistory(pluginId, { limit = 50, skip = 0 } = {}) {
    const purchases = await this.prisma.marketplacePurchase.findMany({
      where: {
        productId: pluginId,
        status: "completed",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    });

    return purchases;
  }

  /**
   * getPluginSalesStats
   * Returns weekly sales breakdown for a plugin (for analytics dashboard).
   *
   * @param {string} pluginId
   * @param {number} [weeks] - Number of weeks to include (default: 12)
   * @returns {Promise<object[]>}
   */
  async getPluginSalesStats(pluginId, weeks = 12) {
    // Get purchases from the last N weeks
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const purchases = await this.prisma.marketplacePurchase.findMany({
      where: {
        productId: pluginId,
        status: "completed",
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
        price: true,
      },
    });

    // Group by week
    const stats = {};
    purchases.forEach((purchase) => {
      const date = new Date(purchase.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!stats[weekKey]) {
        stats[weekKey] = {
          week: weekKey,
          sales: 0,
          revenue: 0,
        };
      }

      stats[weekKey].sales += 1;
      stats[weekKey].revenue += purchase.price / 100;
    });

    return Object.values(stats).sort((a, b) => new Date(a.week) - new Date(b.week));
  }
}

module.exports = PluginBillingService;
