// src/modules/plugins/pluginEngine/executor.js
const fs = require("fs");
const path = require("path");
const { createPluginVM } = require("./sandbox");
const registry = require("./registry");

/**
 * PluginExecutor
 *
 * - Uses createPluginVM to run plugin code safely
 * - Caches raw source to reduce disk reads
 * - If manifest lacks `actions`, supports fallback to exported names
 */
class PluginExecutor {
  constructor({ logger = console, auditService = null, allowedHosts = [] } = {}) {
    this.logger = logger;
    this.audit = auditService;
    this.allowedHosts = Array.isArray(allowedHosts) ? allowedHosts : (String(process.env.PLUGIN_ALLOWED_HOSTS || "")).split(",").map(s => s.trim()).filter(Boolean);
    this.codeCache = new Map(); // pluginId -> source
  }

  _readSource(pluginMeta) {
    if (this.codeCache.has(pluginMeta.id)) return this.codeCache.get(pluginMeta.id);
    const code = fs.readFileSync(pluginMeta.indexPath, "utf8");
    this.codeCache.set(pluginMeta.id, code);
    return code;
  }

  /**
   * Execute plugin action
   * actionType: "plugin:pluginId:action" or "plugin:action" (system tries to resolve)
   */
  async execute(actionType, meta = {}, ctx = {}) {
    if (typeof actionType !== "string" || !actionType.startsWith("plugin:")) {
      throw new Error("PluginExecutor: actionType must start with 'plugin:'");
    }

    const parts = actionType.split(":").slice(1);
    let pluginMeta = null;
    let actionName = null;

    if (parts.length === 1) {
      actionName = parts[0];
      // first: match manifest actions
      pluginMeta = Object.values(registry.list()).find(p => {
        return Array.isArray(p.manifest && p.manifest.actions) && p.manifest.actions.some(a => {
          const t = a.type || a;
          return t === actionType || t === `${p.id}:${actionName}` || t === actionName;
        });
      });

      // fallback: find plugin whose index.js exports this name (simple regex heuristic)
      if (!pluginMeta) {
        pluginMeta = Object.values(registry.list()).find(p => {
          try {
            const code = fs.readFileSync(p.indexPath, "utf8");
            const rx1 = new RegExp(`module\\.exports\\s*\\.\\s*${actionName}\\s*=`);
            const rx2 = new RegExp(`exports\\s*\\.\\s*${actionName}\\s*=`);
            const rx3 = new RegExp(`module\\.exports\\s*=\\s*\\{[\\s\\S]*${actionName}\\s*:`);
            return rx1.test(code) || rx2.test(code) || rx3.test(code);
          } catch (e) {
            return false;
          }
        });
      }
    } else {
      const pluginId = parts[0];
      actionName = parts.slice(1).join(":");
      pluginMeta = registry.get(pluginId);
    }

    if (!pluginMeta) throw new Error(`PluginExecutor: plugin for action ${actionType} not found`);

    const code = this._readSource(pluginMeta);

    const vm = createPluginVM({
      logger: this.logger,
      audit: this.audit,
      allowedHosts: (pluginMeta.manifest && pluginMeta.manifest.allowedHosts) || this.allowedHosts,
      timeout: Number(process.env.PLUGIN_VM_TIMEOUT_MS || 5000),
      memoryLimit: Number(process.env.PLUGIN_VM_MEMORY_MB || 64)
    });

    let exported;
    try {
      exported = vm.run(code, pluginMeta.indexPath);
    } catch (err) {
      this.logger.error(`PluginExecutor: failed to run plugin ${pluginMeta.id}:`, err.stack || err.message);
      throw err;
    }

    // Resolve callable
    let fn = null;
    if (exported) {
      if (actionName && typeof exported[actionName] === "function") fn = exported[actionName];
      else if (typeof exported.run === "function" && (!actionName || actionName === "run")) fn = exported.run;
      else if (typeof exported.default === "function") fn = exported.default;
      else if (!actionName) {
        // fallback: first exported function
        const key = Object.keys(exported).find(k => typeof exported[k] === "function");
        if (key) fn = exported[key];
      }
    }

    if (!fn) throw new Error(`PluginExecutor: action '${actionName || "(default)"}' not found in plugin '${pluginMeta.id}'`);

    try {
      const result = await Promise.resolve(fn(meta, { plugin: pluginMeta, ctx }));
      return result;
    } catch (err) {
      this.logger.error(`PluginExecutor: action threw for plugin ${pluginMeta.id}:`, err.stack || err.message);
      throw err;
    }
  }
}

module.exports = PluginExecutor;
