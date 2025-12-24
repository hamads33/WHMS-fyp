// src/modules/automation/actions/builtin/echo.action.js
module.exports = {
  key: "echo",
  type: "builtin",
  description: "Echo input (testing)",

  schema: {
    type: "object",
    properties: {
      message: { type: "string" },
    },
  },

  async execute(meta) {
    return { echo: meta?.message ?? null };
  },
};
