/**
 * Service Automation Controller
 * Path: src/modules/services/controllers/service-automation.controller.js
 */

const automationService = require("../services/service-automation.service");

class ServiceAutomationController {
  /**
   * Create automation rule
   * POST /admin/services/:id/automations
   */
  async create(req, res) {
    try {
      const serviceId = req.params.id;
      const automation = await automationService.create(
        serviceId,
        req.body,
        req.user
      );
      res.status(201).json(automation);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * List automations by service
   * GET /admin/services/:id/automations
   */
  async listByService(req, res) {
    try {
      const serviceId = req.params.id;
      const automations = await automationService.getByServiceId(serviceId);
      res.json(automations);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get automations by event
   * GET /admin/services/:id/automations/event/:event
   */
  async listByEvent(req, res) {
    try {
      const { id, event } = req.params;
      const automations = await automationService.getByEvent(id, event);
      res.json(automations);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get automation by ID
   * GET /admin/automations/:id
   */
  async get(req, res) {
    try {
      const automation = await automationService.getById(req.params.id);
      res.json(automation);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Update automation
   * PUT /admin/automations/:id
   */
  async update(req, res) {
    try {
      const automation = await automationService.update(
        req.params.id,
        req.body,
        req.user
      );
      res.json(automation);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Delete automation
   * DELETE /admin/automations/:id
   */
  async delete(req, res) {
    try {
      const result = await automationService.delete(req.params.id, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Toggle automation enabled status
   * POST /admin/automations/:id/toggle
   */
  async toggleEnabled(req, res) {
    try {
      const automation = await automationService.toggleEnabled(
        req.params.id,
        req.user
      );
      res.json({
        message: `Automation ${automation.enabled ? "enabled" : "disabled"}`,
        automation,
      });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Create provisioning automation
   * POST /admin/services/:id/automations/provisioning
   */
  async createProvisioning(req, res) {
    try {
      const { module, config } = req.body;
      const automation = await automationService.createProvisioning(
        req.params.id,
        module,
        config,
        req.user
      );
      res.status(201).json(automation);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Create email notification automation
   * POST /admin/services/:id/automations/email
   */
  async createEmailNotification(req, res) {
    try {
      const { event, template } = req.body;
      const automation = await automationService.createEmailNotification(
        req.params.id,
        event,
        template,
        req.user
      );
      res.status(201).json(automation);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Create webhook automation
   * POST /admin/services/:id/automations/webhook
   */
  async createWebhook(req, res) {
    try {
      const { event, webhookUrl } = req.body;

      if (!webhookUrl) {
        return res.status(400).json({ error: "webhookUrl is required" });
      }

      try {
        new URL(webhookUrl);
      } catch {
        return res.status(400).json({ error: "Invalid webhook URL" });
      }

      const automation = await automationService.createWebhook(
        req.params.id,
        event,
        webhookUrl,
        req.user
      );
      res.status(201).json(automation);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get available events
   * GET /admin/automations/available-events
   */
  async getAvailableEvents(req, res) {
    try {
      const events = automationService.getAvailableEvents();
      res.json(events);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get available actions
   * GET /admin/automations/available-actions
   */
  async getAvailableActions(req, res) {
    try {
      const actions = automationService.getAvailableActions();
      res.json(actions);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get available modules
   * GET /admin/automations/available-modules
   */
  async getAvailableModules(req, res) {
    try {
      const modules = automationService.getAvailableModules();
      res.json(modules);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new ServiceAutomationController();