module.exports = {
  name: "system_log",
  type: "builtin",
  description: "Write a system message to audit logs",

  schema: {
    type: "object",
    required: ["message"],
    properties: {
      message: { type: "string" },
      level: {
        type: "string",
        enum: ["INFO", "WARN", "ERROR"],
        default: "INFO",
      },
    },
  },

  async execute(meta, context) {
    const { message, level = "INFO" } = meta;

    // Audit logging (safe side-effect)
    if (context?.audit) {
      await context.audit.log({
        source: "automation",
        action: "system.log",
        actor: "automation-engine",
        level,
        meta: { message },
      });
    }

    return {
      success: true,
      logged: true,
      message,
      level,
    };
  },
};
