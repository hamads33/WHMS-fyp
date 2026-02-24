/**
 * Service Addon Controller
 * Path: src/modules/services/controllers/service-addon.controller.js
 */

const addonService = require("../services/service-addon.service");

class ServiceAddonController {
  /**
   * Create new add-on
   * POST /admin/services/:id/addons
   */
  async create(req, res) {
    try {
      const serviceId = req.params.id;
      const addon = await addonService.create(serviceId, req.body, req.user);
      res.status(201).json(addon);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * List add-ons by service
   * GET /admin/services/:id/addons
   */
  async listByService(req, res) {
    try {
      const serviceId = req.params.id;
      const addons = await addonService.getByServiceId(serviceId);
      res.json(addons);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get add-on by ID
   * GET /admin/addons/:id
   */
  async get(req, res) {
    try {
      const addon = await addonService.getById(req.params.id);
      res.json(addon);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Update add-on
   * PUT /admin/addons/:id
   */
  async update(req, res) {
    try {
      const addon = await addonService.update(
        req.params.id,
        req.body,
        req.user
      );
      res.json(addon);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Delete add-on (soft delete)
   * DELETE /admin/addons/:id
   */
  async delete(req, res) {
    try {
      await addonService.delete(req.params.id, req.user);
      res.status(204).send();
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Toggle add-on active status
   * POST /admin/addons/:id/toggle-active
   */
  async toggleActive(req, res) {
    try {
      const addon = await addonService.update(
        req.params.id,
        { active: req.body.active },
        req.user
      );
      res.json({
        message: `Add-on ${addon.active ? "activated" : "deactivated"}`,
        addon,
      });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get detailed add-on with pricing matrix
   * GET /admin/addons/:id/detailed
   */
  async getDetailed(req, res) {
    try {
      const addon = await addonService.getDetailedById(req.params.id);
      res.json(addon);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Reorder add-ons
   * POST /admin/addons/reorder
   */
  async reorder(req, res) {
    try {
      const { addonIds } = req.body;
      if (!Array.isArray(addonIds)) {
        return res.status(400).json({
          error: "addonIds must be an array",
        });
      }

      await addonService.reorder(addonIds, req.user);
      res.json({ message: "Add-ons reordered successfully" });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Create add-on pricing
   * POST /admin/addons/:id/pricing
   */
  async createPricing(req, res) {
    try {
      const addonId = req.params.id;
      const { cycle, ...data } = req.body;

      const pricing = await addonService.createPricing(
        addonId,
        cycle,
        data,
        req.user
      );
      res.status(201).json(pricing);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Attach add-on to plan
   * POST /admin/addons/:addonId/plans/:planId
   */
  async attachToPlan(req, res) {
    try {
      const { addonId, planId } = req.params;

      const planAddon = await addonService.attachToPlan(
        addonId,
        planId,
        req.body,
        req.user
      );
      res.status(201).json(planAddon);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Detach add-on from plan
   * DELETE /admin/addons/:addonId/plans/:planId
   */
  async detachFromPlan(req, res) {
    try {
      const { addonId, planId } = req.params;

      const result = await addonService.detachFromPlan(
        addonId,
        planId,
        req.user
      );
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new ServiceAddonController();