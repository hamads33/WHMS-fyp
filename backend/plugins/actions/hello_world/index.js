module.exports = {
  id: "hello_world",
  name: "Hello World Plugin",
  version: "1.0.0",
  description: "Simple greeting plugin for testing.",

  jsonSchema: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      shout: { type: "boolean", default: false }
    }
  },

  // REQUIRED BY AUTOMATION ENGINE
  async execute(ctx, config) {
    let message = `Hello ${config.name}`;
    if (config.shout) {
      message = message.toUpperCase() + "!";
    }
    return {
      success: true,
      output: message
    };
  },

  async test(config) {
    return this.execute({ test: true }, config);
  }
};
