// src/modules/automation/pluginEngine/executor.js
/**
 * Robust executor for plugins.
 *
 * - preserves existing behavior (retries, backoff, run records)
 * - validates config against plugin.jsonSchema / plugin.schema
 * - optional sandboxed execution (child process / worker) when available
 * - audit logging on install/run/success/failure
 * - safe fallbacks if sandbox is not present
 */

const prisma = require("../../../lib/prisma");
const registry = require("./pluginRegistry");
const { validateConfig } = require("./validator");
const { log, warn, error } = require("../utils/logger");
const audit = require("../utils/audit");

// Default execution timeout (ms)
const DEFAULT_EXEC_TIMEOUT = Number(process.env.PLUGIN_EXEC_TIMEOUT_MS || 30_000);

// Try to load sandbox executor (optional). If not present, we'll fall back to in-process execution.
let sandboxExec = null;
try {
  // sandbox executor should export: runPlugin(pluginDescriptor, ctx, config, { timeoutMs })
  sandboxExec = require("../../pluginSandbox/childExecutor");
  if (sandboxExec && typeof sandboxExec.runPlugin !== "function") {
    // try alternative export name
    sandboxExec = sandboxExec.default || null;
  }
} catch (e) {
  // sandbox not available — not fatal
  sandboxExec = null;
  log("executor: sandbox not present, will execute plugins in-process when required");
}

/**
 * Normalize old "message" -> "body" compatibility
 */
function normalizeConfig(cfg) {
  if (!cfg) return {};
  const c = { ...cfg };
  if (c.message && !c.body) c.body = c.message;
  return c;
}

/**
 * Simple wait
 */
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Create a timeout wrapped promise for plugin execution (in-process)
 */
function runPluginWithTimeoutInProcess(plugin, ctx, config, timeoutMs) {
  const execPromise = (async () => {
    // plugin.execute may be sync or async
    return plugin.execute ? await plugin.execute(ctx, config) : null;
  })();

  const timeoutPromise = new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`Plugin execution timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  return Promise.race([execPromise, timeoutPromise]);
}

/**
 * Backoff calculation with jitter.
 */
function backoffMsForAttempt(baseMs, attempt) {
  const base = Math.max(50, baseMs || 1000);
  const exp = base * Math.pow(2, Math.max(0, attempt - 1));
  const jitter = Math.floor(exp * (Math.random() * 0.4 - 0.2));
  return Math.max(0, exp + jitter);
}

/**
 * Main executor.
 *
 * task: DB Task row (id, actionId, config, retries, backoffMs, profileId, ...)
 * opts: { test: boolean, maxAttemptsOverride: number }
 */
async function executeTask(task, opts = { test: false }) {
  if (!task) throw new Error("Task is required");

  // Normalize action id access because registry implementations vary
  const actionId = task.actionId || task.action || null;
  if (!actionId) throw new Error("Task.actionId is missing");

  const plugin = registry.get ? registry.get(actionId) : registry.getAction ? registry.getAction(actionId) : null;
  if (!plugin) throw new Error(`Plugin not found: ${actionId}`);

  // Check DB plugin flag (if plugin exists in DB)
  let dbPlugin = null;
  try {
    dbPlugin = await prisma.plugin.findUnique({ where: { id: actionId } });
    if (dbPlugin && dbPlugin.enabled === false) {
      throw new Error(`Plugin disabled: ${actionId}`);
    }
  } catch (e) {
    // If prisma.plugin table doesn't exist or query fails, log and continue.
    // We don't want to crash the whole executor on missing optional table.
    if (e.code === "P2025" || (e.message && e.message.includes("relation \"plugin\" does not exist"))) {
      warn("executor: plugin table not available or prisma error — skipping DB plugin enabled check", { err: e.message });
    } else {
      // for other errors, rethrow
      throw e;
    }
  }

  const config = normalizeConfig(task.config || {});
  const schema = plugin.jsonSchema || plugin.schema || null;

  // Validate config
  const { valid, errors, pretty } = validateConfig(schema, config);
  if (!valid) {
    const ve = new Error("Task config validation failed");
    ve.validation = pretty || errors;
    // create a run record for visibility
    try {
      await prisma.run.create({
        data: {
          taskId: task.id,
          status: "failed",
          attempt: 0,
          startedAt: new Date(),
          finishedAt: new Date(),
          errorMessage: "Task config validation failed",
          log: { validation: ve.validation }
        }
      });
    } catch (e) {
      warn("executor: failed to create validation-failed run record", { err: e.message });
    }
    // audit
    try {
      await audit.logPlugin(task.actionId, "run.validation_failed", {
        taskId: task.id,
        profileId: task.profileId,
        validation: ve.validation
      });
    } catch (e) {
      warn("executor: audit.logPlugin failed for validation", { err: e.message });
    }

    throw ve;
  }

  // Create run record (queued)
  const runRecord = await prisma.run.create({
    data: {
      taskId: task.id,
      status: "queued",
      attempt: 0,
      startedAt: new Date()
    }
  });

  const maxAttempts = Math.max(
    1,
    typeof task.retries === "number"
      ? task.retries
      : typeof opts.maxAttemptsOverride === "number"
      ? opts.maxAttemptsOverride
      : 1
  );

  const baseBackoff = typeof task.backoffMs === "number" ? task.backoffMs : 1000;
  const execTimeout = Number(process.env.PLUGIN_EXEC_TIMEOUT_MS || DEFAULT_EXEC_TIMEOUT);

  let lastErr = null;

  // Decide if we should sandbox this plugin:
  // - prefer sandbox when available and plugin is not explicitly trusted
  // - plugin.trusted flag may be set by loader (boolean) OR plugin.source === 'builtin' can be considered trusted
  const pluginTrusted =
    plugin.trusted === true || plugin.source === "builtin" || (dbPlugin && dbPlugin.source === "builtin");

  const preferSandbox = !!sandboxExec && !pluginTrusted;

  // Audit that we are about to run
  try {
    await audit.logPlugin(task.actionId, "run.start", {
      taskId: task.id,
      profileId: task.profileId,
      attemptLimit: maxAttempts,
      sandboxUsed: preferSandbox
    });
  } catch (e) {
    warn("executor: audit.logPlugin run.start failed", { err: e.message });
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // mark running
    try {
      await prisma.run.update({
        where: { id: runRecord.id },
        data: { attempt, status: "running", startedAt: new Date() }
      });
    } catch (uerr) {
      warn("executor: failed to mark run as running", { err: uerr.message, runId: runRecord.id });
    }

    const start = Date.now();

    try {
      const ctx = { task, test: !!opts.test, attempt, runId: runRecord.id };

      let result;
      if (preferSandbox) {
        // sandboxExec.runPlugin should handle timeout and return result or throw
        try {
          result = await sandboxExec.runPlugin(plugin, ctx, config, { timeoutMs: execTimeout });
        } catch (sandboxErr) {
          // If sandbox throws a special error indicating sandbox failure, bubble up
          throw sandboxErr;
        }
      } else {
        // execute in-process with timeout wrapper
        result = await runPluginWithTimeoutInProcess(plugin, ctx, config, execTimeout);
      }

      const finished = Date.now();

      // mark success
      await prisma.run.update({
        where: { id: runRecord.id },
        data: {
          status: "success",
          finishedAt: new Date(),
          durationMs: finished - start,
          log: result,
          attempt
        }
      });

      // update profile statistics (best-effort)
      try {
        await prisma.profile.update({
          where: { id: task.profileId },
          data: { lastRunAt: new Date(), lastSuccessAt: new Date(), lastError: null }
        });
      } catch (u) {
        warn("executor: failed to update profile stats after success", { err: u.message, profileId: task.profileId });
      }

      // audit success
      try {
        await audit.logPlugin(task.actionId, "run.success", {
          taskId: task.id,
          runId: runRecord.id,
          attempt,
          durationMs: finished - start
        });
      } catch (e) {
        warn("executor: audit.logPlugin run.success failed", { err: e.message });
      }

      log("executor: task succeeded", { taskId: task.id, actionId: actionId, attempt });
      return result;
    } catch (err) {
      lastErr = err;
      const finished = Date.now();

      error("executor: plugin attempt failed", {
        taskId: task.id,
        actionId,
        attempt,
        message: err.message
      });

      // update run record as retrying/failed
      try {
        await prisma.run.update({
          where: { id: runRecord.id },
          data: {
            status: attempt < maxAttempts ? "retrying" : "failed",
            finishedAt: new Date(),
            durationMs: finished - start,
            attempt,
            errorMessage: err.message,
            log:
              err && err.stack
                ? { error: err.message, stack: String(err.stack).split("\n").slice(0, 25) }
                : { error: err.message }
          }
        });
      } catch (uerr) {
        warn("executor: failed to update run after plugin error", { err: uerr.message, runId: runRecord.id });
      }

      // update profile lastError (best-effort)
      try {
        await prisma.profile.update({
          where: { id: task.profileId },
          data: { lastRunAt: new Date(), lastError: err.message }
        });
      } catch (u) {
        warn("executor: failed to update profile lastError", { err: u.message });
      }

      // audit failure
      try {
        await audit.logPlugin(actionId, "run.failure", {
          taskId: task.id,
          runId: runRecord.id,
          attempt,
          message: err.message,
          sandbox: preferSandbox
        });
      } catch (e) {
        warn("executor: audit.logPlugin run.failure failed", { err: e.message });
      }

      // if not last attempt, sleep backoff
      if (attempt < maxAttempts) {
        const ms = backoffMsForAttempt(baseBackoff, attempt);
        log("executor: sleeping before retry", { taskId: task.id, attempt, sleepMs: ms });
        await wait(ms);
      }
    }
  }

  // All attempts exhausted
  throw lastErr || new Error("Task execution failed after retries");
}

module.exports = { executeTask };
