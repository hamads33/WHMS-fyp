// src/modules/pluginSandbox/worker.js
const { parentPort, workerData } = require('worker_threads');

async function safeRun() {
  const { pluginPath, pluginId, ctx, config } = workerData;

  try {
    // load plugin fresh
    delete require.cache[require.resolve(pluginPath)];
    const mod = require(pluginPath);

    if (!mod || typeof mod.execute !== 'function') {
      throw new Error(`Plugin ${pluginId} does not export execute(ctx, config)`);
    }

    // run plugin
    const out = await Promise.resolve(mod.execute(ctx, config));

    // serialize result - ensure it's JSON serializable (best-effort)
    parentPort.postMessage({ type: 'result', result: out });
  } catch (err) {
    parentPort.postMessage({
      type: 'error',
      error: {
        message: err.message,
        stack: err.stack ? String(err.stack).split('\n').slice(0, 30).join('\n') : undefined
      }
    });
  }
}

safeRun();
