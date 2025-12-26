// src/modules/automation/actions/registry.js
const builtins = require("./builtin");

module.exports = {
  get(actionType) {
    return builtins.get(actionType);
  },

  list() {
    return builtins.all.map(a => ({
      name: a.name,
      type: "builtin",
      description: a.description,
      schema: a.schema || null,
    }));
  },
};
