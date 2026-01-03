// src/modules/plugins/api.js
// Clean internal API surface for Plugin Module

const path = require("path");

/* ------------------------------------------------------------------
   SERVICES
------------------------------------------------------------------- */
const RuntimeVerifier = require(path.join(__dirname, "services", "runtimeVerifier.service"));
const ExecutorService = require(path.join(__dirname, "..", "automation", "services", "executor.service"));

/* ------------------------------------------------------------------
   PLUGIN ENGINE COMPONENTS
------------------------------------------------------------------- */
const Loader = require(path.join(__dirname, "pluginEngine", "loader"));
const Registry = require(path.join(__dirname, "pluginEngine", "registry"));
const VMExecutor = require(path.join(__dirname, "pluginEngine", "vmExecutor"));
const WASMExecutor = require(path.join(__dirname, "pluginEngine", "wasmExecutor"));

/* ------------------------------------------------------------------
   SAFETY WRAPPER
------------------------------------------------------------------- */
function safeCall(fn, ...args) {
  if (typeof fn !== "function") {
    throw new Error("Plugin API: Missing implementation");
  }

  try {
    return fn(...args);
  } catch (err) {
    throw new Error(`Plugin API call failed: ${err.message}`);
  }
}

/* ------------------------------------------------------------------
   PUBLIC INTERNAL API EXPORT
------------------------------------------------------------------- */
module.exports = {
  /**
   * Runtime Verification
   * Properly bound to service instance
   */
  runRuntimeVerification: async (opts = {}) => {
    return safeCall(RuntimeVerifier.run.bind(RuntimeVerifier), opts);
  },

  /**
   * Create Executor instance
   */
  createExecutor: (opts = {}) => {
    return new ExecutorService(opts);
  },

  /**
   * Registry access
   */
  registryList: () => {
    return safeCall(Registry.list.bind(Registry));
  },

  registryGet: (id) => {
    return safeCall(Registry.get.bind(Registry), id);
  },

  registryGetAction: (pluginId, actionName) => {
    return safeCall(Registry.getAction.bind(Registry), pluginId, actionName);
  },

  registryListActions: (pluginId) => {
    return safeCall(Registry.listActions.bind(Registry), pluginId);
  },

  /**
   * Reload runtime
   * Tries multiple reload strategies
   */
  reloadRuntime: async () => {
    try {
      // Try global plugin engine
      if (global.pluginEngine?.reload) {
        return await global.pluginEngine.reload();
      }

      // Try app locals
      if (global.app?.locals?.pluginEngine?.reload) {
        return await global.app.locals.pluginEngine.reload();
      }

      // Try loader directly
      if (Loader?.reload) {
        return await Loader.reload();
      }

      throw new Error("No reload method available");
    } catch (err) {
      console.error("reloadRuntime failed:", err.message);
      return null;
    }
  },

  /**
   * Create VM Executor
   */
  createVMExecutor: (opts = {}) => {
    return new VMExecutor(opts);
  },

  /**
   * Create WASM Executor
   */
  createWASMExecutor: (opts = {}) => {
    return new WASMExecutor(opts);
  },

  /**
   * Optional exports
   */
  ExecutorService,
  RuntimeVerifier,
  Registry,
  Loader,
  VMExecutor,
  WASMExecutor
};