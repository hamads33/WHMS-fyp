// src/modules/automation/services/automation.service.js
// Non-breaking improvements: timeout, safer logging, better validation errors,
// safer promise handling, plugin isolation, and clearer retry cycle.

const registry = require('../pluginEngine/pluginRegistry');
const { validateConfig } = require('../pluginEngine/validator');
const runRepo = require('../repositories/log.repo');
const { log, error } = require('../utils/logger');

const EXEC_TIMEOUT = 20000; // 20s hard timeout (non-breaking addition)

// Timeout wrapper, non-breaking
function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`Task timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

// normalize legacy fields (unchanged)
function normalizeConfig(config) {
  if (!config) return {};
  const cfg = { ...config };
  if (cfg.message && !cfg.body) cfg.body = cfg.message;
  return cfg;
}

/**
 * Executes a task with retry/backoff.
 * Non-breaking enhancement version.
 */
async function executeTaskRun(task, runOptions = { test: false }) {
  if (!task) throw new Error('Task required');

  const actionMeta = registry.get(task.actionId);
  if (!actionMeta) throw new Error(`Action not found: ${task.actionId}`);

  const config = normalizeConfig(task.config || {});
  const schema = actionMeta.schema || actionMeta.jsonSchema || null;

  // Validate before run (unchanged behavior)
  const { valid, errors, pretty } = validateConfig(schema, config);
  if (!valid) {
    const err = new Error('Task config validation failed');
    err.validation = errors;
    err.validationPretty = pretty;
    throw err;
  }

  // Create run record (unchanged)
  const runRecord = await runRepo.createRun({
    taskId: task.id,
    status: 'queued',
    attempt: 0,
    startedAt: new Date()
  });

  const maxAttempts = Math.max(1, typeof task.retries === 'number' ? task.retries : 1);
  const backoffMs = typeof task.backoffMs === 'number' ? task.backoffMs : 1000;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runRepo.updateRun(runRecord.id, {
        status: 'running',
        attempt,
        startedAt: new Date()
      });

      const ctx = {
        test: !!runOptions.test,
        task,
        attempt,
        runId: runRecord.id
      };

      const plugin = registry.get(task.actionId);
      if (!plugin || typeof plugin.execute !== 'function') {
        throw new Error(`Plugin ${task.actionId} has no execute()`);
      }

      // 🔥 Non-breaking safety: timeout wrapper around plugin execution
      const pluginPromise = Promise.resolve().then(() => plugin.execute(config, ctx));
      const result = await withTimeout(pluginPromise, EXEC_TIMEOUT);

      // Non-breaking: store structured logs
      await runRepo.updateRun(runRecord.id, {
        status: 'success',
        finishedAt: new Date(),
        log: typeof result === 'object' ? result : { output: String(result) },
        attempt
      });

      log(`automation.service: task ${task.id} succeeded (action=${task.actionId})`);
      return { success: true, result };

    } catch (err) {
      lastError = err;
      error(`automation.service: task ${task.id} failed on attempt ${attempt}`, {
        message: err.message,
        attempt
      });

      // Non-breaking: safer structured log
      try {
        await runRepo.updateRun(runRecord.id, {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage: err.message,
          attempt,
          log: {
            message: err.message,
            type: err.name,
            stack: err.stack ? String(err.stack).split('\n').slice(0, 15) : undefined
          }
        });
      } catch (uerr) {
        error('automation.service: failed to update run after error', uerr);
      }

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }

  throw lastError || new Error('Task execution failed');
}

module.exports = { executeTaskRun };
