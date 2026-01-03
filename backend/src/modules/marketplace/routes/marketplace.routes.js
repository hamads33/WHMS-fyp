// src/modules/marketplace/routes/marketplace.routes.js
// Public marketplace API endpoints (FR-M01, FR-M02, FR-M10)

const express = require('express');

module.exports = function marketplaceRoutes({
  marketplaceService,
  analyticsService,
  dependencyService,
  licensingService,
  prisma,
  logger = console
} = {}) {
  const router = express.Router();

  /**
   * FR-M01: GET /plugins - Browse all approved plugins
   */
  router.get('/plugins', async (req, res, next) => {
    try {
      const { page, limit, category, search, sort, minRating } = req.query;

      const result = await marketplaceService.browsePlugins({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        category: category || null,
        search: search || null,
        sortBy: sort || 'downloads',
        minRating: parseFloat(minRating) || 0
      });

      res.json({
        ok: true,
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('[Marketplace] Browse plugins error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M02: GET /plugins/:id - View plugin specifications and metadata
   */
  router.get('/plugins/:id', async (req, res, next) => {
    try {
      const plugin = await marketplaceService.getPluginDetails(req.params.id);

      // Track view event
      if (analyticsService) {
        analyticsService.trackEvent(
          plugin.id,
          plugin.currentVersion?.version,
          req.user?.id || 'anonymous',
          'view'
        ).catch(e => logger.debug('Analytics event failed:', e.message));
      }

      res.json({
        ok: true,
        data: plugin
      });
    } catch (error) {
      if (error.message === 'plugin_not_found') {
        return res.status(404).json({
          ok: false,
          error: 'Plugin not found'
        });
      }
      if (error.message === 'plugin_not_available') {
        return res.status(403).json({
          ok: false,
          error: 'Plugin not available'
        });
      }
      logger.error('[Marketplace] Get plugin details error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M02: GET /plugins/:id/dependencies - Get plugin dependencies
   */
  router.get('/plugins/:id/dependencies', async (req, res, next) => {
    try {
      const dependencies = await dependencyService.getProductDependencies(req.params.id);
      
      res.json({
        ok: true,
        data: dependencies
      });
    } catch (error) {
      logger.error('[Marketplace] Get dependencies error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M10: GET /plugins/:id/reviews - View plugin ratings
   */
  router.get('/plugins/:id/reviews', async (req, res, next) => {
    try {
      const { page, limit } = req.query;

      const result = await marketplaceService.getPluginRatings(req.params.id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      });

      res.json({
        ok: true,
        data: result.reviews,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('[Marketplace] Get reviews error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M10: POST /plugins/:id/reviews - Submit plugin rating
   */
  router.post('/plugins/:id/reviews', async (req, res, next) => {
    try {
      // Require authentication
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'Authentication required'
        });
      }

      const { rating, text } = req.body;

      const review = await marketplaceService.submitRating(
        req.params.id,
        req.user.id,
        rating,
        text
      );

      res.json({
        ok: true,
        data: review
      });
    } catch (error) {
      if (error.message === 'invalid_rating') {
        return res.status(400).json({
          ok: false,
          error: 'Rating must be between 1 and 5'
        });
      }
      if (error.message === 'plugin_not_found') {
        return res.status(404).json({
          ok: false,
          error: 'Plugin not found'
        });
      }
      logger.error('[Marketplace] Submit review error:', error.message);
      next(error);
    }
  });

  /**
   * GET /categories - List all plugin categories
   */
  router.get('/categories', async (req, res, next) => {
    try {
      const categories = await marketplaceService.getCategories();

      res.json({
        ok: true,
        data: categories
      });
    } catch (error) {
      logger.error('[Marketplace] Get categories error:', error.message);
      next(error);
    }
  });

  /**
   * GET /plugins/:id/license - Check plugin licensing requirements
   */
  router.get('/plugins/:id/license', async (req, res, next) => {
    try {
      const licenseInfo = await licensingService.getLicenseInfo(req.params.id);

      res.json({
        ok: true,
        data: licenseInfo
      });
    } catch (error) {
      if (error.message === 'product_not_found') {
        return res.status(404).json({
          ok: false,
          error: 'Plugin not found'
        });
      }
      logger.error('[Marketplace] Get license error:', error.message);
      next(error);
    }
  });

  /**
   * GET /plugins/:id/stats - Get plugin usage statistics (public view)
   */
  router.get('/plugins/:id/stats', async (req, res, next) => {
    try {
      const stats = await analyticsService.getPluginStats(req.params.id);

      // Return limited public stats
      res.json({
        ok: true,
        data: {
          downloads: stats.downloads,
          activeInstances: stats.activeInstances,
          rating: stats.rating,
          totalRatings: stats.totalRatings
        }
      });
    } catch (error) {
      if (error.message === 'product_not_found') {
        return res.status(404).json({
          ok: false,
          error: 'Plugin not found'
        });
      }
      logger.error('[Marketplace] Get stats error:', error.message);
      next(error);
    }
  });

  /**
   * Search endpoint
   */
  router.get('/search', async (req, res, next) => {
    try {
      const { q, category, sort } = req.query;

      if (!q) {
        return res.status(400).json({
          ok: false,
          error: 'Search query required'
        });
      }

      const result = await marketplaceService.browsePlugins({
        search: q,
        category: category || null,
        sortBy: sort || 'downloads',
        page: 1,
        limit: 20
      });

      res.json({
        ok: true,
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('[Marketplace] Search error:', error.message);
      next(error);
    }
  });

  return router;
};