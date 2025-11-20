// src/modules/automation/utils/audit.js
const prisma = require("../../../lib/prisma");

module.exports = {
  /** System-level logs: plugin loaded, system started, etc. */
  async logSystem(action, payload = {}) {
    try {
      await prisma.audit.create({
        data: {
          actor: "system",
          action,
          payload
        }
      });
    } catch (err) {
      console.error("[audit.logSystem] failed:", err.message);
    }
  },

  /** Plugin-specific logs: install, update, remove, execution */
  async logPlugin(pluginId, action, payload = {}) {
    try {
      await prisma.auditLog.create({
        data: {
          pluginId,
          action,
          meta: payload
        }
      });
    } catch (err) {
      console.error("[audit.logPlugin] failed:", err.message);
    }
  },

  /** Security logs: signature mismatch, sandbox violation, etc. */
  async logSecurity(eventType, payload = {}) {
    try {
      await prisma.audit.create({
        data: {
          actor: "security",
          action: eventType,
          payload
        }
      });
    } catch (err) {
      console.error("[audit.logSecurity] failed:", err.message);
    }
  }
};
