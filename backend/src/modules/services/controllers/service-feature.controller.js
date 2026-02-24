/**
 * Service Feature Controller
 * Path: src/modules/services/controllers/service-feature.controller.js
 */

const featureService = require("../services/service-feature.service");

class ServiceFeatureController {
  /**
   * Create new feature
   * POST /admin/services/:id/features
   */
  async create(req, res) {
    try {
      const serviceId = req.params.id;
      const feature = await featureService.create(
        serviceId,
        req.body,
        req.user
      );
      res.status(201).json(feature);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * List features by service
   * GET /admin/services/:id/features
   */
  async listByService(req, res) {
    try {
      const serviceId = req.params.id;
      const features = await featureService.getByServiceId(serviceId);
      res.json(features);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get features by category
   * GET /admin/services/:id/features/category/:category
   */
  async getByCategory(req, res) {
    try {
      const { id, category } = req.params;
      const features = await featureService.getByCategory(id, category);
      res.json(features);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get feature by ID
   * GET /admin/features/:id
   */
  async get(req, res) {
    try {
      const feature = await featureService.getById(req.params.id);
      res.json(feature);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Update feature
   * PUT /admin/features/:id
   */
  async update(req, res) {
    try {
      const feature = await featureService.update(
        req.params.id,
        req.body,
        req.user
      );
      res.json(feature);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Delete feature
   * DELETE /admin/features/:id
   */
  async delete(req, res) {
    try {
      const result = await featureService.delete(req.params.id, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Reorder features
   * POST /admin/features/reorder
   */
  async reorder(req, res) {
    try {
      const { featureIds } = req.body;
      if (!Array.isArray(featureIds)) {
        return res.status(400).json({
          error: "featureIds must be an array",
        });
      }

      await featureService.reorder(featureIds, req.user);
      res.json({ message: "Features reordered successfully" });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Set feature value for plan
   * POST /admin/features/:featureId/plans/:planId/value
   */
  async setFeatureForPlan(req, res) {
    try {
      const { featureId, planId } = req.params;
      const { value } = req.body;

      if (!value) {
        return res.status(400).json({
          error: "Feature value is required",
        });
      }

      const planFeature = await featureService.setFeatureForPlan(
        featureId,
        planId,
        value,
        req.user
      );
      res.json(planFeature);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get feature comparison matrix
   * GET /admin/services/:id/features/comparison
   */
  async getComparison(req, res) {
    try {
      const serviceId = req.params.id;
      const comparison = await featureService.getComparison(serviceId);
      res.json(comparison);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get all features for a plan
   * GET /admin/plans/:id/features
   */
  async getPlanFeatures(req, res) {
    try {
      const planId = req.params.id;
      const features = await featureService.getPlanFeatures(planId);
      res.json(features);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new ServiceFeatureController();