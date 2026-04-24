module.exports = {
  name: "Echo",
  type: "builtin",
  actionType: "echo",
  module: "core",
  description: "Echo input for testing",

  schema: {
    type: "object",
    properties: {
      message: { type: "string" },
    },
  },

  async execute(meta) {
    return { echo: meta };
  },
};
