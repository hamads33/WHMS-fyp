// src/modules/automation/services/automation.service.js
const { validateSchema } = require('../utils/validator');
const registry = require('../utils/actionRegistry');
const runRepo = require('../repositories/log.repo');
const { log, error } = require('../utils/logger');

// backward compatibility normalization
function normalizeConfig(config) {
  if (!config) return {};

  const cfg = { ...config };

  if (cfg.message && !cfg.body) {
    cfg.body = cfg.message;
  }

  return cfg;
}

async function executeTaskRun(task, runOptions = { test: false }) {
  const actionMeta = registry.getAction(task.actionId);
  if (!actionMeta) throw new Error(`Action not found: ${task.actionId}`);

  // normalize config BEFORE validation
  const config = normalizeConfig(task.config);

  // validate config
  const { jsonSchema } = actionMeta;
  const { valid, errors } = validateSchema(jsonSchema, config);
  if (!valid) {
    const err = new Error("Task config validation failed");
    err.validation = errors;
    throw err;
  }

  // create run
  const runRecord = await runRepo.createRun({
    taskId: task.id,
    status: 'queued',
    attempt: 1
  });

  const maxAttempts = task.retries || 1;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      await runRepo.updateRun(runRecord.id, {
        status: 'running',
        attempt
      });

      const ctx = {
        test: !!runOptions.test,
        task,
        attempt
      };

      const result = await actionMeta.execute(ctx, config);

      await runRepo.updateRun(runRecord.id, {
        status: 'success',
        finishedAt: new Date(),
        log: result
      });

      log(`Task ${task.id} executed successfully`, result);
      return { success: true, result };
    } catch (err) {
      lastError = err;
      error('Task execution error', err);

      await runRepo.updateRun(runRecord.id, {
        status: 'failed',
        errorMessage: err.message,
        attempt,
        log: { error: err.message, stack: err.stack?.split("\n")?.slice(0, 10) }
      });

      if (attempt < maxAttempts) {
        const ms = task.backoffMs || 1000;
        await new Promise(r => setTimeout(r, ms));
      }
    }
  }

  throw lastError;
}

module.exports = { executeTaskRun };
