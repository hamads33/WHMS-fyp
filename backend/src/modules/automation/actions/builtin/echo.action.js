module.exports = {
  name: "echo",
  type: "builtin",
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
