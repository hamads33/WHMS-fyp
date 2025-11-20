// src/modules/pluginSandbox/audit/sandboxAudit.service.js
const prisma = require("../../../lib/prisma");
const { log, error } = require("../../automation/utils/logger") || console;

async function logPluginEvent(pluginId, action, payload = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: null,
        action: `plugin.${action}`,
        meta: { pluginId, ...payload },
      }
    });
  } catch (err) {
    // don't throw — audit failure shouldn't break plugin runs
    error("sandboxAudit: failed to write auditLog", err.message || err);
  }
}

async function logSystem(action, payload = {}) {
  try {
    await prisma.audit.create({
      data: {
        actor: "pluginSandbox",
        action,
        payload
      }
    });
  } catch (err) {
    error("sandboxAudit: failed to write audit", err.message || err);
  }
}

module.exports = { logPluginEvent, logSystem };
