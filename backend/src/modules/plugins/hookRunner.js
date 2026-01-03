// src/modules/plugins/hookRunner.js
// Reliable hook execution with proper error handling and circuit breaker

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

const failureCounts = new Map();
const circuitState = new Map(); // 'open' | 'closed'

/**
 * Check if circuit breaker is open for a hook
 */
function isCircuitOpen(hookId) {
  const state = circuitState.get(hookId);
  if (state?.status === 'open') {
    const elapsed = Date.now() - state.openedAt;
    if (elapsed > CIRCUIT_BREAKER_TIMEOUT) {
      // Reset circuit after timeout
      circuitState.delete(hookId);
      failureCounts.delete(hookId);
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Record hook failure
 */
function recordFailure(hookId) {
  const count = (failureCounts.get(hookId) || 0) + 1;
  failureCounts.set(hookId, count);

  if (count >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitState.set(hookId, {
      status: 'open',
      openedAt: Date.now()
    });
    return true; // Circuit opened
  }
  return false;
}

/**
 * Record hook success
 */
function recordSuccess(hookId) {
  failureCounts.delete(hookId);
  circuitState.delete(hookId);
}

/**
 * Run hooks for an event
 * 
 * @param {string} eventName - The event to trigger
 * @param {object} payload - Data to pass to hooks
 * @param {object} context - { app, prisma, logger }
 * @returns {Promise<object>} Results summary
 */
module.exports = async function runHooks(
  eventName,
  payload = {},
  { app, prisma, logger } = {}
) {
  if (!app) {
    throw new Error("hookRunner requires { app }");
  }

  const registry = app.locals?.pluginEngine?.registry;
  const pluginEngine = app.locals?.pluginEngine;

  if (!registry || !pluginEngine || typeof pluginEngine.runAction !== "function") {
    if (logger?.warn) {
      logger.warn("hookRunner: plugin engine not available");
    }
    return { executed: 0, succeeded: 0, failed: 0 };
  }

  const hooks = registry.getHooks(eventName);

  if (!hooks || hooks.length === 0) {
    if (logger?.debug) {
      logger.debug(`hookRunner: no hooks for ${eventName}`);
    }
    return { executed: 0, succeeded: 0, failed: 0 };
  }

  let executed = 0;
  let succeeded = 0;
  let failed = 0;

  // Execute hooks sequentially
  for (const hook of hooks) {
    const hookId = `${hook.pluginId}:${hook.actionPath}`;

    // Check circuit breaker
    if (isCircuitOpen(hookId)) {
      if (logger?.warn) {
        logger.warn(
          `hookRunner: circuit open for ${hookId}, skipping`
        );
      }
      continue;
    }

    try {
      const { pluginId, actionPath } = hook;
      const actionName = actionPath;

      if (logger?.info) {
        logger.info(
          `hookRunner: executing hook ${eventName} -> ${pluginId}::${actionName}`
        );
      }

      executed++;

      // Execute with timeout
      const timeoutMs = 30000; // 30 seconds
      const execution = pluginEngine.runAction(pluginId, actionName, payload || {});
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Hook execution timeout")), timeoutMs)
      );

      const result = await Promise.race([execution, timeout]);

      recordSuccess(hookId);
      succeeded++;

      // Write audit log if available
      if (prisma?.auditLog) {
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
          if (logger?.warn) {
            logger.warn("hookRunner: failed to write audit:", e.message);
          }
        }
      }
    } catch (err) {
      failed++;

      const circuitOpened = recordFailure(hookId);

      if (logger?.error) {
        logger.error(
          `hookRunner: hook ${eventName} failed for ${hook.pluginId}::${hook.actionPath}`,
          err.message
        );

        if (circuitOpened) {
          logger.error(
            `hookRunner: circuit breaker opened for ${hookId} after ${CIRCUIT_BREAKER_THRESHOLD} failures`
          );
        }
      }

      // Write audit log for failure
      if (prisma?.auditLog) {
        try {
          await prisma.auditLog.create({
            data: {
              source: "plugin",
              action: `hook.${eventName}.failed`,
              actor: hook.pluginId,
              level: "ERROR",
              meta: {
                eventName,
                payload,
                error: err.message,
                circuitOpened
              }
            }
          });
        } catch (e) {
          // Ignore audit failures
        }
      }
    }
  }

  if (logger?.info) {
    logger.info(
      `hookRunner: ${eventName} completed - executed: ${executed}, succeeded: ${succeeded}, failed: ${failed}`
    );
  }

  return { executed, succeeded, failed };
};

/**
 * Get circuit breaker stats
 */
module.exports.getCircuitStats = function() {
  const stats = [];
  for (const [hookId, state] of circuitState.entries()) {
    const failures = failureCounts.get(hookId) || 0;
    stats.push({
      hookId,
      status: state.status,
      openedAt: state.openedAt,
      failures
    });
  }
  return stats;
};

/**
 * Reset circuit breaker for a hook
 */
module.exports.resetCircuit = function(hookId) {
  circuitState.delete(hookId);
  failureCounts.delete(hookId);
};