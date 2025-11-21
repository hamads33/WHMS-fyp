// src/modules/automation/validators/task.validator.js

module.exports = {
  type: "object",
  properties: {
    actionType: { type: "string", minLength: 1 },
    actionMeta: { type: "object" },
    order: { type: "integer", minimum: 0 }
  },
  required: ["actionType"],
  additionalProperties: false
};
