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
    return [...builtins.actionMap.entries()].map(([key, action]) => ({
      key,
      name: action.name,
      type: "builtin",
      actionType: action.actionType || key,
      module: action.module || "core",
      description: action.description,
      schema: action.schema || null,
    }));
  },
};
