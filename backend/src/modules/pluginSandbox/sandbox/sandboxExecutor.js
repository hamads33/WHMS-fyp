// src/modules/pluginSandbox/sandboxExecutor.js
const path = require('path');
const { Worker } = require('worker_threads');
const { promisify } = require('util');
const crypto = require('crypto');
const fs = require('fs');
const { log, warn, error } = require('../automation/utils/logger'); // adjust path if necessary
const pluginVerifier = require('./pluginVerifier');

const DEFAULT_WORKER_TIMEOUT = Number(process.env.PLUGIN_WORKER_TIMEOUT_MS || 25_000);
const WORKER_SCRIPT = path.join(__dirname, 'worker.js');

/**
 * Run a plugin inside a worker thread (safe mode).
 * pluginDescriptor: { id, source, path } — path should be absolute path to plugin file or folder index.js
 * ctx, config: plugin inputs
 * timeoutMs: optional
 */
function runPluginInWorker(pluginDescriptor, ctx, config, timeoutMs = DEFAULT_WORKER_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const workerData = {
      pluginPath: pluginDescriptor.path,
      pluginId: pluginDescriptor.id,
      ctx: ctx || {},
      config: config || {}
    };

    const worker = new Worker(WORKER_SCRIPT, { workerData, argv: [] });

    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        worker.terminate().catch(() => {});
      } catch (e) {}
      const err = new Error(`Plugin worker timeout after ${timeoutMs}ms (${pluginDescriptor.id})`);
      err.code = 'PLUGIN_TIMEOUT';
      reject(err);
    }, timeoutMs);

    worker.on('message', (msg) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (msg && msg.type === 'result') {
        resolve(msg.result);
      } else if (msg && msg.type === 'error') {
        const e = new Error(msg.error?.message || 'Plugin error');
        e.stack = msg.error?.stack;
        reject(e);
      } else {
        resolve(msg);
      }
    });

    worker.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    });

    worker.on('exit', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Plugin worker exited with code ${code}`));
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Public: runPlugin(pluginDescriptor, ctx, config, opts)
 * opts:
 *   - trustedRunAllowed: boolean (if true, run in-process when pluginDescriptor.trusted)
 *   - timeoutMs
 */
async function runPlugin(pluginDescriptor, ctx, config, opts = {}) {
  const timeoutMs = opts.timeoutMs || DEFAULT_WORKER_TIMEOUT;
  const trustedRunAllowed = !!opts.trustedRunAllowed;

  // If plugin declares `trusted: true` and trusted runs allowed, run in-process
  if (trustedRunAllowed && pluginDescriptor.trusted) {
    // run in-process (safest to use original execute signature)
    try {
      const mod = require(pluginDescriptor.path);
      // prefer plugin.execute(ctx, config)
      if (typeof mod.execute !== 'function') {
        throw new Error(`Plugin module does not export execute() — ${pluginDescriptor.id}`);
      }
      // run with timeout by Promise.race (still not sandboxed, but trusted)
      const execPromise = Promise.resolve().then(() => mod.execute(ctx, config));
      const timerPromise = new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`Trusted plugin execution timed out after ${timeoutMs}ms`)), timeoutMs)
      );
      return await Promise.race([execPromise, timerPromise]);
    } catch (err) {
      // rethrow so caller handles logging & retries
      throw err;
    }
  }

  // otherwise run in worker (sandboxed)
  return await runPluginInWorker(pluginDescriptor, ctx, config, timeoutMs);
}

module.exports = { runPlugin, runPluginInWorker };
