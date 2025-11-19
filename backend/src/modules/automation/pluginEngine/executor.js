// src/modules/automation/pluginEngine/executor.js
const prisma = require("../../../lib/prisma");
const registry = require("./pluginRegistry");
const { validateConfig } = require("./validator");
const { log, warn, error } = require("../utils/logger");

// Default execution timeout (ms)
const DEFAULT_EXEC_TIMEOUT = Number(process.env.PLUGIN_EXEC_TIMEOUT_MS || 30_000);

/**
 * Helper: normalize legacy fields
 */
function normalizeConfig(cfg) {
  if (!cfg) return {};
  const c = { ...cfg };
  if (c.message && !c.body) c.body = c.message;
  return c;
}

/**
 * Helper: wait milliseconds
 */
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Execute a plugin with timeout
 */
async function runPluginWithTimeout(plugin, ctx, config, timeoutMs) {
  const execPromise = Promise.resolve().then(() => plugin.execute(ctx, config));
  const timeoutPromise = new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`Plugin execution timed out after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([execPromise, timeoutPromise]);
}

/**
 * Exponential backoff with jitter
 */
function backoffMsForAttempt(baseMs, attempt) {
  // exponential: base * 2^(attempt-1)
  const base = Math.max(50, baseMs || 1000);
  const exp = base * Math.pow(2, Math.max(0, attempt - 1));
  // jitter: +/- 20%
  const jitter = Math.floor(exp * (Math.random() * 0.4 - 0.2));
  return Math.max(0, exp + jitter);
}

/**
 * Main: executeTask with retries, logging, and DB updates.
 * - task: Task DB row with .id, .actionId, .config, .retries, .backoffMs, .profileId
 * - opts: { test: boolean, maxAttemptsOverride: number }
 */
async function executeTask(task, opts = { test: false }) {
  if (!task) throw new Error("Task is required");

  const plugin = registry.get(task.actionId);
  if (!plugin) throw new Error(`Plugin not found: ${task.actionId}`);

  // DB plugin flag check
  const dbPlugin = await prisma.plugin.findUnique({ where: { id: task.actionId } });
  if (dbPlugin && dbPlugin.enabled === false) {
    throw new Error(`Plugin disabled: ${task.actionId}`);
  }

  const config = normalizeConfig(task.config || {});
  const schema = plugin.jsonSchema || plugin.schema || null;

  const { valid, errors, pretty } = validateConfig(schema, config);
  if (!valid) {
    const ve = new Error("Task config validation failed");
    ve.validation = pretty || errors;
    throw ve;
  }

  // Create run record (attempt 0 = queued)
  const runRecord = await prisma.run.create({
    data: {
      taskId: task.id,
      status: "queued",
      attempt: 0,
      startedAt: new Date()
    }
  });

  const maxAttempts = Math.max(1, typeof task.retries === "number" ? task.retries : (opts.maxAttemptsOverride || 1));
  const baseBackoff = typeof task.backoffMs === "number" ? task.backoffMs : 1000;
  const execTimeout = Number(process.env.PLUGIN_EXEC_TIMEOUT_MS || DEFAULT_EXEC_TIMEOUT);

  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // mark running attempt
    await prisma.run.update({
      where: { id: runRecord.id },
      data: { attempt, status: "running", startedAt: new Date() }
    });

    const start = Date.now();
    try {
      const ctx = { task, test: !!opts.test, attempt, runId: runRecord.id };

      const result = await runPluginWithTimeout(plugin, ctx, config, execTimeout);

      const finished = Date.now();

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

      // update profile statistics
      try {
        await prisma.profile.update({
          where: { id: task.profileId },
          data: { lastRunAt: new Date(), lastSuccessAt: new Date(), lastError: null }
        });
      } catch (u) {
        warn("executor: failed to update profile stats", { err: u.message, profileId: task.profileId });
      }

      log("executor: task succeeded", { taskId: task.id, actionId: task.actionId, attempt });
      return result;
    } catch (err) {
      lastErr = err;
      const finished = Date.now();

      error("executor: plugin attempt failed", { taskId: task.id, actionId: task.actionId, attempt, message: err.message });

      // update run as failed for this attempt
      try {
        await prisma.run.update({
          where: { id: runRecord.id },
          data: {
            status: attempt < maxAttempts ? "retrying" : "failed",
            finishedAt: new Date(),
            durationMs: finished - start,
            attempt,
            errorMessage: err.message,
            log: { error: err.message, stack: err.stack ? String(err.stack).split("\n").slice(0, 25) : undefined }
          }
        });
      } catch (uerr) {
        warn("executor: failed to update run after plugin error", { err: uerr.message, runId: runRecord.id });
      }

      // update profile lastError
      try {
        await prisma.profile.update({
          where: { id: task.profileId },
          data: { lastRunAt: new Date(), lastError: err.message }
        });
      } catch (u) {
        warn("executor: failed to update profile lastError", { err: u.message });
      }

      if (attempt < maxAttempts) {
        const ms = backoffMsForAttempt(baseBackoff, attempt);
        log("executor: sleeping before retry", { taskId: task.id, attempt, sleepMs: ms });
        await wait(ms);
      }
    }
  }

  throw lastErr || new Error("Task execution failed after retries");
}

module.exports = { executeTask };
