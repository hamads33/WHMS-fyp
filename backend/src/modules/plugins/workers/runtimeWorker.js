// src/modules/plugins/workers/runtimeWorker.js
// Secure worker for plugin runtime verification

const { parentPort, workerData } = require("worker_threads");
const vm = require("vm");
const fs = require("fs");
const path = require("path");

(async () => {
  const logs = [];
  
  const pushLog = (lvl, msg) => {
    logs.push({
      lvl,
      msg,
      ts: new Date().toISOString()
    });
  };

  try {
    const { folder, manifest, timeoutMs = 5000 } = workerData;

    if (!folder || !fs.existsSync(folder)) {
      parentPort.postMessage({
        passed: false,
        logs,
        details: { error: "plugin folder missing" }
      });
      return;
    }

    // Determine entry file
    const entry = (manifest && manifest.entry) || "index.js";
    const entryPath = path.join(folder, entry);

    if (!fs.existsSync(entryPath)) {
      pushLog("error", `Entry file not found: ${entryPath}`);
      parentPort.postMessage({
        passed: false,
        logs,
        details: { error: "entry_not_found", entryPath }
      });
      return;
    }

    // Read code
    const code = fs.readFileSync(entryPath, "utf8");

    // Create safe sandbox
    const sandboxConsole = {
      log: (...args) => pushLog(
        "log",
        args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")
      ),
      warn: (...args) => pushLog(
        "warn",
        args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")
      ),
      error: (...args) => pushLog(
        "error",
        args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")
      )
    };

    const sandbox = {
      console: sandboxConsole,
      module: { exports: {} },
      exports: {},
      require: () => {
        throw new Error("require() is disabled in runtime smoke-test");
      },
      setTimeout,
      Promise,
      JSON,
      Buffer: undefined,
      process: { env: {} },
      global: undefined,
      __dirname: folder,
      __filename: entryPath
    };

    const script = new vm.Script(code, { filename: entryPath });
    const context = vm.createContext(sandbox, { name: "plugin-sandbox" });

    // Run with timeout
    try {
      script.runInContext(context, {
        timeout: Math.max(timeoutMs || 2000, 2000),
        displayErrors: true
      });
      
      pushLog("info", "Execution completed (sync)");
    } catch (e) {
      pushLog("error", "Script execution error: " + e.message);
      parentPort.postMessage({
        passed: false,
        logs,
        details: { error: "execution_error", message: e.message }
      });
      return;
    }

    // Check for selftest function
    const exported = sandbox.module?.exports || sandbox.exports;
    
    if (exported && typeof exported.selftest === "function") {
      pushLog("info", "selftest() found, invoking");
      
      try {
        const result = exported.selftest();

        // Handle promise result with timeout
        if (result && typeof result.then === "function") {
          const promiseWithTimeout = new Promise((resolve, reject) => {
            let completed = false;
            
            const timer = setTimeout(() => {
              if (!completed) {
                completed = true;
                reject(new Error("selftest timeout"));
              }
            }, Math.max(timeoutMs || 2000, 2000));

            Promise.resolve(result)
              .then((r) => {
                if (!completed) {
                  completed = true;
                  clearTimeout(timer);
                  resolve(r);
                }
              })
              .catch((err) => {
                if (!completed) {
                  completed = true;
                  clearTimeout(timer);
                  reject(err);
                }
              });
          });

          const outcome = await promiseWithTimeout;
          
          pushLog(
            "info",
            "selftest result: " +
              (typeof outcome === "string" ? outcome : JSON.stringify(outcome))
          );
          
          parentPort.postMessage({
            passed: true,
            logs,
            details: { smokeTest: outcome }
          });
          return;
        } else {
          // Sync result
          pushLog(
            "info",
            "selftest result: " +
              (typeof result === "string" ? result : JSON.stringify(result))
          );
          
          parentPort.postMessage({
            passed: true,
            logs,
            details: { smokeTest: result }
          });
          return;
        }
      } catch (e) {
        pushLog("error", "selftest failed: " + e.message);
        parentPort.postMessage({
          passed: false,
          logs,
          details: { error: "selftest_failed", message: e.message }
        });
        return;
      }
    }

    // No selftest, basic execution passed
    parentPort.postMessage({
      passed: true,
      logs,
      details: { smokeTest: "no_selftest, basic_exec_ok" }
    });
  } catch (err) {
    parentPort.postMessage({
      passed: false,
      logs,
      details: { error: err.message }
    });
  }
})();