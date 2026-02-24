const pricingService = require("../services/service-pricing.service");

class ServicePricingController {
  /**
   * Create pricing for a plan
   */
  async create(req, res) {
    try {
      const planId = req.params.id;
      const pricing = await pricingService.create(planId, req.body, req.user);
      res.status(201).json(pricing);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get all pricing for a plan
   */
  async listByPlan(req, res) {
    try {
      const planId = req.params.id;
      const pricing = await pricingService.getByPlanId(planId);
      res.json(pricing);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get pricing by ID
   */
  async get(req, res) {
    try {
      const pricingId = req.params.id;
      const pricing = await pricingService.getById(pricingId);
      res.json(pricing);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Update pricing
   */
  async update(req, res) {
    try {
      const pricingId = req.params.id;
      const pricing = await pricingService.update(pricingId, req.body, req.user);
      res.json(pricing);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Delete pricing (soft delete via active flag)
   */
  async delete(req, res) {
    try {
      const pricingId = req.params.id;
      await pricingService.delete(pricingId, req.user);
      res.status(204).send();
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  async listActiveByPlan(req, res) {
    try {
      const planId = req.params.id;
      const pricing = await pricingService.getActiveByPlanId(planId);
      res.json(pricing);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async getComparison(req, res) {
    try {
      const data = await pricingService.getComparison(req.params.id);
      res.json(data);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = new ServicePricingController();