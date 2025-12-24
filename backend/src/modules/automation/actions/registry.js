// src/modules/automation/actions/registry.js
const builtins = require("./builtin");

const actionMap = new Map();

for (const action of builtins) {
  actionMap.set(action.key, action);
}

module.exports = {
  list() {
    return Array.from(actionMap.values()).map(a => ({
      key: a.key,
      type: a.type,
      description: a.description,
      schema: a.schema,
    }));
  },

  get(key) {
    return actionMap.get(key);
  },
};
