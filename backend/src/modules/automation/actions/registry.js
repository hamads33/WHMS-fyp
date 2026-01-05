// src/modules/automation/actions/registry.js
const builtins = require("./builtin");

module.exports = {
  /**
   * Get action by canonical actionType
   * @param {string} actionType
   */
  get(actionType) {
    return builtins.get(actionType);
  },

  /**
   * List actions for UI consumption
   * IMPORTANT:
   * - key  → engine identifier (used by executor)
   * - name → display label (UI only)
   */
  list() {
    return builtins.all.map(action => ({
      key: "http_request",          // canonical engine key
      name: action.name,            // display name
      type: "builtin",
      description: action.description,
      schema: action.schema || null,
    }));
  },
};
