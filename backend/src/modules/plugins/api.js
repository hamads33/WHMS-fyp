// src/modules/plugins/api.js
// Internal API surface for the Plugin Module.
// Marketplace imports this file directly — no HTTP layer.

const path = require("path");

/* ------------------------------------------------------------------
   SERVICES
------------------------------------------------------------------- */
const RuntimeVerifier = require(path.join(__dirname, "services", "runtimeVerifier.service"));
const ExecutorService = require(path.join(__dirname, "services", "executor.service"));

/* ------------------------------------------------------------------
   PLUGIN ENGINE COMPONENTS
------------------------------------------------------------------- */
const Loader = require(path.join(__dirname, "pluginEngine", "loader"));
const Registry = require(path.join(__dirname, "pluginEngine", "registry"));
const Executor = require(path.join(__dirname, "pluginEngine", "executor"));

/* ------------------------------------------------------------------
   SAFETY WRAPPER
------------------------------------------------------------------- */
function safeCall(fn, ...args) {
  if (typeof fn !== "function") {
    throw new Error("Plugin API: Missing implementation");
  }

  return fn(...args);
}

/* ------------------------------------------------------------------
   PUBLIC INTERNAL API EXPORT
------------------------------------------------------------------- */
module.exports = {
  /* --------------------------------------------------------------
     (FR-M8) Runtime Verification (IMPORTANT: bind instance!)
  -------------------------------------------------------------- */
  runRuntimeVerification: async (opts = {}) =>
    safeCall(RuntimeVerifier.run.bind(RuntimeVerifier), opts),

  /* --------------------------------------------------------------
     Executor Factory
  -------------------------------------------------------------- */
  createExecutor: (opts = {}) => new Executor(opts),

  /* --------------------------------------------------------------
     Registry / Loader
  -------------------------------------------------------------- */
  registryList: () => safeCall(Registry.list.bind(Registry)),
  registryGet: (id) => safeCall(Registry.get.bind(Registry), id),

  reloadRuntime: async () => {
    try {
      if (global.pluginEngine?.reload) {
        return global.pluginEngine.reload();
      }
    } catch (_) {}

    if (Loader?.reload) return Loader.reload();
    return null;
  },

  /* --------------------------------------------------------------
     Optional exports
  -------------------------------------------------------------- */
  ExecutorService,
};
