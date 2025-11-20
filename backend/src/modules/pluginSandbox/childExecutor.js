// src/modules/pluginSandbox/childExecutor.js
const path = require("path");
const { fork } = require("child_process");
const { log, error, warn } = require("../../modules/automation/utils/logger") || console;
const DEFAULT_TIMEOUT = Number(process.env.PLUGIN_EXEC_TIMEOUT_MS || 30_000);

/**
 * Execute plugin in a child process (childRunner.js).
 * @param {Object} opts
 *   - pluginPath: absolute path to plugin's index.js
 *   - config: plugin config object
 *   - ctx: arbitrary context (taskId/profileId/test/etc) - will be forwarded
 *   - timeoutMs: optional override
 *   - maxMemoryMb: optional (for --max-old-space-size)
 * @returns {Promise<any>}
 */
function runInChild(opts = {}) {
  const pluginPath = opts.pluginPath;
  if (!pluginPath) return Promise.reject(new Error("pluginPath required"));

  const timeoutMs = Number(opts.timeoutMs || DEFAULT_TIMEOUT);
  const maxMemoryMb = Number(opts.maxMemoryMb || process.env.PLUGIN_CHILD_MAX_MEM_MB || 256);

  // child runner path (relative to project root)
  const runnerFile = path.join(__dirname, "childRunner.js");

  // node arguments: limit memory for child
  const nodeArgs = [`--max-old-space-size=${maxMemoryMb}`];

  // fork child runner
  const child = fork(runnerFile, [], {
    execArgv: nodeArgs,
    stdio: ["pipe", "pipe", "pipe", "ipc"],
    env: {
      ...process.env,
      // optional: mark child as sandbox
      PLUGIN_SANDBOX: "1",
    }
  });

  let settled = false;

  return new Promise((resolve, reject) => {
    // safety timeout: kill child if it doesn't respond
    const watchdog = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { child.kill("SIGKILL"); } catch (e) {}
        const err = new Error(`Plugin child timed out after ${timeoutMs}ms`);
        err.code = "PLUGIN_TIMEOUT";
        error(`[childExecutor] timeout`, { pluginPath, timeoutMs });
        reject(err);
      }
    }, timeoutMs + 2000); // slight buffer

    // forward child's stdout/stderr to parent logs (optional)
    child.stdout?.on("data", (b) => log(`[plugin-child stdout] ${String(b).trim()}`));
    child.stderr?.on("data", (b) => warn(`[plugin-child stderr] ${String(b).trim()}`));

    // receive result via IPC
    child.on("message", (msg) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      if (msg && msg.ok) {
        resolve(msg.result);
      } else {
        const err = new Error(msg && msg.error ? msg.error : "Unknown plugin error");
        if (msg && msg.stack) err.stack = msg.stack;
        reject(err);
      }
      // ensure child exit
      try { child.kill("SIGKILL"); } catch (e) {}
    });

    child.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      const err = new Error(`Plugin child exited unexpectedly (code=${code} signal=${signal})`);
      err.code = "PLUGIN_CHILD_EXIT";
      reject(err);
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      reject(err);
    });

    // send payload
    child.send({
      pluginPath,
      config: opts.config || {},
      ctx: opts.ctx || {}
    });
  });
}

module.exports = { runInChild };
