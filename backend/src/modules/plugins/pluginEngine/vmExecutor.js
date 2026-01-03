// src/modules/plugins/pluginEngine/vmExecutor.js
// Secure VM executor using isolated-vm instead of deprecated vm2

const path = require("path");
const fs = require("fs");

// Try to use isolated-vm, fallback to Node's VM for development
let ivm;
let useIsolatedVM = false;

try {
  ivm = require("isolated-vm");
  useIsolatedVM = true;
} catch {
  console.warn("⚠️  isolated-vm not available, using Node VM (less secure)");
}

/**
 * Sanitize meta object to prevent prototype pollution
 */
function sanitizeMeta(obj, depth = 0) {
  if (depth > 10) return null; // Prevent deep recursion
  if (obj === null || typeof obj !== "object") return obj;

  const clean = Array.isArray(obj) ? [] : {};
  
  for (const [key, val] of Object.entries(obj)) {
    // Block dangerous properties
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    clean[key] = sanitizeMeta(val, depth + 1);
  }
  
  return clean;
}

/**
 * VM Executor with isolated-vm for security
 */
class VMExecutor {
  constructor({
    logger,
    memoryLimit = 128, // MB
    timeoutMs = 5000
  } = {}) {
    this.logger = logger || console;
    this.memoryLimit = memoryLimit;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Run plugin action in isolated VM
   */
  async run({
    pluginId,
    pluginDir,
    actionFile,
    fnName = null,
    ctx = {}
  }) {
    // Sanitize metadata
    const safeMeta = sanitizeMeta(ctx.meta || {});

    const actionPath = path.isAbsolute(actionFile)
      ? actionFile
      : path.join(pluginDir, actionFile);

    if (!fs.existsSync(actionPath)) {
      throw new Error(`Action file not found: ${actionPath}`);
    }

    const code = fs.readFileSync(actionPath, "utf8");

    if (useIsolatedVM) {
      return await this._runIsolated(code, safeMeta, pluginId, actionPath, fnName);
    } else {
      return await this._runNodeVM(code, safeMeta, pluginId, actionPath, fnName);
    }
  }

  /**
   * Run with isolated-vm (production)
   */
  async _runIsolated(code, safeMeta, pluginId, actionPath, fnName) {
    const isolate = new ivm.Isolate({ memoryLimit: this.memoryLimit });
    const context = await isolate.createContext();

    try {
      // Create safe console
      const jail = context.global;
      await jail.set("global", jail.derefInto());

      // Inject safe meta
      await jail.set("PLUGIN_META", new ivm.ExternalCopy(safeMeta).copyInto());

      // Create safe console
      const logCallback = new ivm.Reference((...args) => {
        this.logger.info(`[plugin:${pluginId}]`, ...args);
      });

      await jail.set("__log", logCallback);
      await context.eval(`
        globalThis.console = {
          log: (...args) => __log.applyIgnored(undefined, args),
          warn: (...args) => __log.applyIgnored(undefined, args),
          error: (...args) => __log.applyIgnored(undefined, args)
        };
      `);

      // Compile and run the code
      const script = await isolate.compileScript(code, { filename: actionPath });
      await script.run(context, { timeout: this.timeoutMs });

      // Get the exported function
      const exportName = fnName || "handler";
      const fnExists = await context.eval(`typeof ${exportName} === 'function'`, { timeout: 100 });

      if (!fnExists) {
        // Try module.exports pattern
        const hasModuleExports = await context.eval(
          `typeof module !== 'undefined' && typeof module.exports === 'function'`,
          { timeout: 100 }
        );

        if (!hasModuleExports) {
          throw new Error(`No callable export found in ${actionPath}`);
        }
      }

      // Execute the function
      const resultRef = await context.eval(
        `(async () => {
          const fn = ${fnName || "module.exports"};
          return await fn({ meta: PLUGIN_META });
        })()`,
        { timeout: this.timeoutMs, promise: true }
      );

      // Copy result out of isolate
      const result = await resultRef.copy();
      
      return result;
    } finally {
      context.release();
      isolate.dispose();
    }
  }

  /**
   * Run with Node's VM (development fallback)
   */
  async _runNodeVM(code, safeMeta, pluginId, actionPath, fnName) {
    const vm = require("vm");

    // Create sandbox
    const sandbox = {
      console: {
        log: (...args) => this.logger.info(`[plugin:${pluginId}]`, ...args),
        warn: (...args) => this.logger.warn(`[plugin:${pluginId}]`, ...args),
        error: (...args) => this.logger.error(`[plugin:${pluginId}]`, ...args)
      },
      PLUGIN_META: safeMeta,
      module: { exports: {} },
      exports: {},
      require: () => {
        throw new Error("require() is disabled in plugin sandbox");
      },
      setTimeout,
      Promise,
      JSON,
      Buffer: undefined,
      process: undefined,
      global: undefined
    };

    const context = vm.createContext(sandbox);

    try {
      // Run the code
      vm.runInContext(code, context, {
        filename: actionPath,
        timeout: this.timeoutMs,
        displayErrors: true
      });

      // Get the function
      let fn = null;
      if (typeof sandbox.module.exports === "function") {
        fn = sandbox.module.exports;
      } else if (fnName && typeof sandbox[fnName] === "function") {
        fn = sandbox[fnName];
      } else if (typeof sandbox.exports === "function") {
        fn = sandbox.exports;
      } else if (typeof sandbox.handler === "function") {
        fn = sandbox.handler;
      }

      if (!fn) {
        throw new Error(
          `No callable export in ${actionPath}. Expected function export or handler.`
        );
      }

      // Execute with timeout
      const execution = Promise.resolve(fn({ meta: safeMeta }));
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Execution timeout")), this.timeoutMs)
      );

      const result = await Promise.race([execution, timeout]);
      return result;
    } catch (err) {
      this.logger.error(
        `Plugin VM Error [${pluginId}] → ${err.stack || err.message}`
      );
      throw err;
    }
  }
}

module.exports = VMExecutor;