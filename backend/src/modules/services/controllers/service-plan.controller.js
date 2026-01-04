const planService = require("../services/service-plan.service");

class ServicePlanController {
  /**
   * Create a new service plan
   */
  async create(req, res) {
    try {
      const serviceId = Number(req.params.id);
      const plan = await planService.create(serviceId, req.body, req.user);
      res.status(201).json(plan);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get all plans for a service
   */
  async listByService(req, res) {
    try {
      const serviceId = Number(req.params.id);
      const plans = await planService.getByServiceId(serviceId);
      res.json(plans);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get plan by ID
   */
  async get(req, res) {
    try {
      const planId = Number(req.params.id);
      const plan = await planService.getById(planId);
      res.json(plan);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Update service plan details
   */
  async update(req, res) {
    try {
      const planId = Number(req.params.id);
      const plan = await planService.update(planId, req.body, req.user);
      res.json(plan);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Toggle plan active status
   */
  async toggleActive(req, res) {
    try {
      const planId = Number(req.params.id);
      const plan = await planService.toggleActive(planId, req.user);
      res.json({
        message: `Plan ${plan.active ? "activated" : "deactivated"} successfully`,
        plan,
      });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Activate plan
   */
  async activate(req, res) {
    try {
      const planId = Number(req.params.id);
      const plan = await planService.activate(planId, req.user);
      res.json({
        message: "Plan activated successfully",
        plan,
      });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Deactivate plan
   */
  async deactivate(req, res) {
    try {
      const planId = Number(req.params.id);
      const plan = await planService.deactivate(planId, req.user);
      res.json({
        message: "Plan deactivated successfully",
        plan,
      });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get active plans by service (client view)
   */
  async listActiveByService(req, res) {
    try {
      const serviceId = Number(req.params.id);
      const plans = await planService.getActiveByServiceId(serviceId);
      res.json(plans);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new ServicePlanController();