const planService = require("../services/service-plan.service");

class ServicePlanController {
  /**
   * Create a new service plan
   */
  async create(req, res) {
    try {
      const serviceId = req.params.id;
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
      const serviceId = req.params.id;
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
      const planId = req.params.id;
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
      const planId = req.params.id;
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
      const planId = req.params.id;
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
      const planId = req.params.id;
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
      const planId = req.params.id;
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

  async listActiveByService(req, res) {
    try {
      const serviceId = req.params.id;
      const plans = await planService.getActiveByServiceId(serviceId);
      res.json(plans);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async toggleVisibility(req, res) {
    try {
      const plan = await planService.toggleVisibility(req.params.id, req.user);
      res.json(plan);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async getComparison(req, res) {
    try {
      const data = await planService.getComparison(req.params.id);
      res.json(data);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async getStats(req, res) {
    try {
      const data = await planService.getStats(req.params.id);
      res.json(data);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async bulkUpdate(req, res) {
    try {
      const { ids, data } = req.body;
      const result = await planService.bulkUpdate(ids, data, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async import(req, res) {
    try {
      const serviceId = req.params.serviceId;
      const results = await planService.importPlans(serviceId, req.body, req.user);
      res.json(results);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async export(req, res) {
    try {
      const serviceId = req.params.id;
      const data = await planService.exportPlans(serviceId);
      res.json(data);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = new ServicePlanController();