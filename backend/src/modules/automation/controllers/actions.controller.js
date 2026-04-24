/**
 * ActionsController
 * ------------------------------------------------------------------
 * Exposes available automation actions to the frontend.
 *
 * Responsibilities:
 *  - List all available actions (built-in + plugin)
 *  - Get details for a specific action
 *  - Return action schemas for validation
 *
 * Used by:
 *  - Workflow builder (populate action dropdown)
 *  - Task creation UI (show action options)
 *  - Action documentation
 */

class ActionsController {
  constructor({ actionRegistry, logger }) {
    this.actionRegistry = actionRegistry;
    this.logger = logger;
  }

  // ==================================================
  // LIST ALL AVAILABLE ACTIONS
  // ==================================================
  async list(req, res) {
    try {
      const actions = this.actionRegistry.list();
      return res.success(actions);
    } catch (err) {
      this.logger.error("Failed to list actions:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // GET SINGLE ACTION DETAILS
  // ==================================================
  async get(req, res) {
    try {
      const { actionType } = req.params;

      if (!actionType || typeof actionType !== 'string') {
        return res.fail("Action type is required", 400, "invalid_param");
      }

      const action = this.actionRegistry.get(actionType);

      if (!action) {
        return res.fail(`Action not found: ${actionType}`, 404, "action_not_found");
      }

      // Format response
      const response = {
        name: action.name,
        type: actionType,
        description: action.description,
        schema: action.schema || null,
      };

      return res.success(response);
    } catch (err) {
      this.logger.error("Failed to get action:", err);
      return res.error(err, 500);
    }
  }
}

module.exports = ActionsController;