// src/modules/marketplace/services/analytics.service.js
// Handles analytics tracking for marketplace events

class AnalyticsService {
  constructor({ prisma = null, logger = console } = {}) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Track marketplace event
   * Events: install, update, view, submit, approve, reject
   */
  async trackEvent(eventType, data = {}) {
    try {
      this.logger.info(`📊 Analytics Event: ${eventType}`, data);

      if (!this.prisma?.marketplaceAnalytics) {
        this.logger.warn('⚠️ Analytics table not available');
        return null;
      }

      const event = await this.prisma.marketplaceAnalytics.create({
        data: {
          id: data.id || this._generateId(),
          eventType,
          productId: data.productId || null,
          versionId: data.versionId || null,
          userId: data.userId || null,
          meta: data.meta || {},
          timestamp: new Date()
        }
      });

      return event;
    } catch (error) {
      this.logger.error('❌ Analytics tracking error:', error.message);
      return null;
    }
  }

  /**
   * Track plugin installation
   */
  async trackInstall(productId, userId, meta = {}) {
    return this.trackEvent('install', {
      productId,
      userId,
      meta: {
        ...meta,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track plugin update
   */
  async trackUpdate(productId, versionId, userId, meta = {}) {
    return this.trackEvent('update', {
      productId,
      versionId,
      userId,
      meta: {
        ...meta,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track plugin view/download
   */
  async trackView(productId, userId = null, meta = {}) {
    return this.trackEvent('view', {
      productId,
      userId,
      meta: {
        ...meta,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track plugin submission
   */
  async trackSubmission(productId, userId, meta = {}) {
    return this.trackEvent('submit', {
      productId,
      userId,
      meta: {
        ...meta,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track plugin approval
   */
  async trackApproval(productId, userId, meta = {}) {
    return this.trackEvent('approve', {
      productId,
      userId,
      meta: {
        ...meta,
        approvedBy: userId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track plugin rejection
   */
  async trackRejection(productId, userId, reason = '', meta = {}) {
    return this.trackEvent('reject', {
      productId,
      userId,
      meta: {
        ...meta,
        rejectedBy: userId,
        reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track rating submission
   */
  async trackRating(productId, userId, rating, meta = {}) {
    return this.trackEvent('rating', {
      productId,
      userId,
      meta: {
        ...meta,
        rating,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(productId, options = {}) {
    try {
      if (!this.prisma?.marketplaceAnalytics) {
        return null;
      }

      const { startDate, endDate, eventType } = options;

      const where = { productId };

      if (eventType) where.eventType = eventType;

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      const events = await this.prisma.marketplaceAnalytics.findMany({
        where,
        orderBy: { timestamp: 'desc' }
      });

      // Aggregate statistics
      const stats = {
        totalEvents: events.length,
        installs: events.filter(e => e.eventType === 'install').length,
        updates: events.filter(e => e.eventType === 'update').length,
        views: events.filter(e => e.eventType === 'view').length,
        ratings: events.filter(e => e.eventType === 'rating').length,
        avgRating: this._calculateAverageRating(events),
        uniqueUsers: [...new Set(events.map(e => e.userId))].length,
        events
      };

      return stats;
    } catch (error) {
      this.logger.error('❌ Get analytics error:', error.message);
      return null;
    }
  }

  /**
   * Get developer analytics
   */
  async getDeveloperAnalytics(developerId, options = {}) {
    try {
      if (!this.prisma?.marketplaceProduct) {
        return null;
      }

      // Get all products by developer
      const products = await this.prisma.marketplaceProduct.findMany({
        where: { developerId },
        select: { id: true, name: true, totalDownloads: true }
      });

      const allAnalytics = [];
      for (const product of products) {
        const analytics = await this.getProductAnalytics(product.id, options);
        if (analytics) {
          allAnalytics.push({
            product: product.name,
            productId: product.id,
            ...analytics
          });
        }
      }

      // Aggregate all products
      const totalStats = {
        totalProducts: products.length,
        totalDownloads: products.reduce((a, b) => a + b.totalDownloads, 0),
        totalEvents: allAnalytics.reduce((a, b) => a + b.totalEvents, 0),
        totalInstalls: allAnalytics.reduce((a, b) => a + b.installs, 0),
        totalUpdates: allAnalytics.reduce((a, b) => a + b.updates, 0),
        totalViews: allAnalytics.reduce((a, b) => a + b.views, 0),
        products: allAnalytics
      };

      return totalStats;
    } catch (error) {
      this.logger.error('❌ Get developer analytics error:', error.message);
      return null;
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats() {
    try {
      if (!this.prisma) {
        return null;
      }

      const [
        totalProducts,
        approvedProducts,
        totalInstalls,
        totalRatings,
        avgRating
      ] = await Promise.all([
        this.prisma.marketplaceProduct?.count() || 0,
        this.prisma.marketplaceProduct?.count({ where: { status: 'approved' } }) || 0,
        this.prisma.marketplaceAnalytics?.count({ where: { eventType: 'install' } }) || 0,
        this.prisma.marketplaceReview?.count() || 0,
        this._getAverageRating()
      ]);

      return {
        totalProducts,
        approvedProducts,
        pendingProducts: totalProducts - approvedProducts,
        totalInstalls,
        totalRatings,
        avgMarketplaceRating: avgRating,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('❌ Get marketplace stats error:', error.message);
      return null;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(productId, format = 'json') {
    try {
      const analytics = await this.getProductAnalytics(productId);

      if (format === 'csv') {
        return this._convertToCsv(analytics);
      }

      return analytics;
    } catch (error) {
      this.logger.error('❌ Export analytics error:', error.message);
      return null;
    }
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  _generateId() {
    return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _calculateAverageRating(events) {
    const ratings = events
      .filter(e => e.eventType === 'rating')
      .map(e => e.meta?.rating)
      .filter(Boolean);

    if (ratings.length === 0) return 0;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
  }

  async _getAverageRating() {
    try {
      const reviews = await this.prisma.marketplaceReview?.findMany({
        select: { rating: true }
      }) || [];

      if (reviews.length === 0) return 0;
      return (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(2);
    } catch (error) {
      return 0;
    }
  }

  _convertToCsv(analytics) {
    if (!analytics?.events) return '';

    const headers = ['timestamp', 'eventType', 'productId', 'userId'];
    const rows = analytics.events.map(e => [
      e.timestamp,
      e.eventType,
      e.productId,
      e.userId
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    return csv;
  }
}

module.exports = AnalyticsService;