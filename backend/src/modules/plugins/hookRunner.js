// src/modules/plugins/hookRunner.js
const AuditService = require("../automation/services/audit.service"); // optional path; we'll use audit if provided

/**
 * runHooks(eventName, payload, { app, prisma, logger })
 * - finds registered hooks via registry.getHooks(eventName)
 * - executes pluginEngine.runAction(pluginId, actionName, payload)
 * - non-blocking for each hook (awaits them but errors are caught and logged)
 */
module.exports = async function runHooks(eventName, payload = {}, { app, prisma, logger } = {}) {
  if (!app) throw new Error("hookRunner requires { app }");
  const registry = app.locals?.pluginEngine?.registry;
  const pluginEngine = app.locals?.pluginEngine;
  if (!registry || !pluginEngine || typeof pluginEngine.runAction !== "function") {
    logger && logger.warn("hookRunner: plugin engine not available");
    return;
  }

  const hooks = registry.getHooks(eventName);
  if (!hooks || hooks.length === 0) {
    logger && logger.debug && logger.debug(`hookRunner: no hooks for ${eventName}`);
    return;
  }

  // fire hooks sequentially (could be parallel but sequential is safer for ordering)
  for (const h of hooks) {
    try {
      const { pluginId, actionPath } = h;
      // actionPath is the registered actionName in registry.registerHook
      const actionName = actionPath;

      logger && logger.info && logger.info(`hookRunner: executing hook ${eventName} -> ${pluginId}::${actionName}`);

      const result = await pluginEngine.runAction(pluginId, actionName, payload || {});

      // write audit log if prisma present
      if (prisma && prisma.auditLog) {
        try {
          await prisma.auditLog.create({
            data: {
              source: "plugin",
              action: `hook.${eventName}`,
              actor: pluginId,
              level: "INFO",
              meta: { eventName, payload, result }
            }
          });
        } catch (e) {
          logger && logger.warn && logger.warn("hookRunner: failed to write audit", e.message || e);
        }
      }
    } catch (err) {
      logger && logger.error && logger.error(`hookRunner: hook ${eventName} failed for ${h.pluginId}`, err);
    }
  }
};
