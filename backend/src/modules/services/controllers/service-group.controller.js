/**
 * Service Group Controller
 * Path: src/modules/services/controllers/service-group.controller.js
 */

const groupService = require("../services/service-group.service");

class ServiceGroupController {
  /**
   * Create a new service group
   * POST /admin/services/groups
   */
  async create(req, res) {
    try {
      const group = await groupService.create(req.body, req.user);
      res.status(201).json(group);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * List all service groups (admin)
   * GET /admin/services/groups
   */
  async list(req, res) {
    try {
      const groups = await groupService.listAll();
      res.json(groups);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get service group by ID
   * GET /admin/services/groups/:id
   */
  async get(req, res) {
    try {
      const group = await groupService.getById(req.params.id);
      res.json(group);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Update service group
   * PUT /admin/services/groups/:id
   */
  async update(req, res) {
    try {
      const group = await groupService.update(
        req.params.id,
        req.body,
        req.user
      );
      res.json(group);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Delete service group
   * DELETE /admin/services/groups/:id
   */
  async delete(req, res) {
    try {
      const result = await groupService.delete(req.params.id, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Toggle group visibility
   * POST /admin/services/groups/:id/toggle-visibility
   */
  async toggleVisibility(req, res) {
    try {
      const group = await groupService.toggleVisibility(
        req.params.id,
        req.user
      );
      res.json({
        message: `Group visibility toggled`,
        group,
      });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Reorder groups
   * POST /admin/services/groups/reorder
   */
  async reorder(req, res) {
    try {
      const { groupIds } = req.body;
      if (!Array.isArray(groupIds)) {
        return res.status(400).json({
          error: "groupIds must be an array",
        });
      }

      await groupService.reorder(groupIds, req.user);
      res.json({ message: "Groups reordered successfully" });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Bulk update groups
   * POST /admin/services/groups/bulk-update
   */
  async bulkUpdate(req, res) {
    try {
      const { ids, data } = req.body;
      const result = await groupService.bulkUpdate(ids, data, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  /**
   * Bulk delete groups
   * POST /admin/services/groups/bulk-delete
   */
  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      const result = await groupService.bulkDelete(ids, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  /**
   * Get group statistics
   * GET /admin/services/groups/:id/stats
   */
  async getStats(req, res) {
    try {
      const stats = await groupService.getStats(req.params.id);
      res.json(stats);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }
}

module.exports = new ServiceGroupController();