// src/modules/pluginSandbox/services/sandbox.service.js
const { Worker } = require("worker_threads");
const path = require("path");
const { maxExecutionMs, maxMemoryMb } = require("../sandbox/limits");

async function runPlugin(pluginCode, config, ctx) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      path.join(__dirname, "../sandbox/worker.js"),
      {
        resourceLimits: {
          maxOldGenerationSizeMb: maxMemoryMb
        }
      }
    );

    worker.postMessage({
      pluginCode,
      config,
      ctx,
      timeoutMs: maxExecutionMs
    });

    worker.on("message", (msg) => {
      if (msg.success) resolve(msg.result);
      else reject(new Error(msg.error));
      worker.terminate();
    });

    worker.on("error", (err) => {
      worker.terminate();
      reject(err);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Sandbox crashed. Exit code: ${code}`));
      }
    });
  });
}

module.exports = { runPlugin };
