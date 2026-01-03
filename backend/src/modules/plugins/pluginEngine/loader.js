// src/modules/plugins/pluginEngine/loader.js
// Fixed loader with proper cache management and validation

const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

// Plugin ID validation
const PLUGIN_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

class PluginLoader {
  constructor({
    pluginsDir,
    logger,
    ajv,
    registry,
    publicKeyPem,
    app
  } = {}) {
    this.pluginsDir = pluginsDir || path.join(process.cwd(), "plugins", "actions");
    this.logger = logger || console;
    this.ajv = ajv || null;
    this.registry = registry || require("./registry");
    this.publicKeyPem = publicKeyPem;
    this.app = app;

    try {
      this.manifestSchema = require("../validators/manifest.schema");
    } catch {
      this.manifestSchema = null;
    }
  }

  /**
   * Load all plugins with proper error handling
   */
  async loadAll() {
    const plugins = {};

    try {
      const dirExists = await fs.access(this.pluginsDir)
        .then(() => true)
        .catch(() => false);

      if (!dirExists) {
        this.logger.info(
          `PluginLoader: no plugins directory at ${this.pluginsDir}`
        );
        if (this.registry.clear) this.registry.clear();
        return plugins;
      }

      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });

      for (const dirent of entries) {
        if (!dirent.isDirectory()) continue;

        const folder = dirent.name;

        // Validate plugin ID
        if (!PLUGIN_ID_REGEX.test(folder)) {
          this.logger.warn(
            `PluginLoader: skipping ${folder} (invalid plugin ID format)`
          );
          continue;
        }

        const base = path.join(this.pluginsDir, folder);
        
        try {
          const plugin = await this._loadPlugin(folder, base);
          if (plugin) {
            plugins[plugin.id] = plugin;
          }
        } catch (err) {
          this.logger.error(
            `PluginLoader: failed to load ${folder}: ${err.message}`
          );
        }
      }

      // Atomic registry update
      this._syncRegistry(plugins);

      return plugins;
    } catch (err) {
      this.logger.error(`PluginLoader: loadAll failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Load a single plugin
   */
  async _loadPlugin(folder, base) {
    const manifestPath = path.join(base, "manifest.json");
    const indexPath = path.join(base, "index.js");

    // Check manifest exists
    const manifestExists = await fs.access(manifestPath)
      .then(() => true)
      .catch(() => false);

    if (!manifestExists) {
      this.logger.warn(
        `PluginLoader: skipping ${folder} (no manifest.json)`
      );
      return null;
    }

    // Read and parse manifest
    let manifest;
    try {
      const manifestContent = await fs.readFile(manifestPath, "utf8");
      manifest = JSON.parse(manifestContent);
    } catch (err) {
      this.logger.error(
        `PluginLoader: invalid manifest.json for ${folder}: ${err.message}`
      );
      return null;
    }

    // Validate manifest
    if (this.ajv && this.manifestSchema) {
      const valid = this.ajv.validate(this.manifestSchema, manifest);
      if (!valid) {
        this.logger.error(
          `PluginLoader: manifest validation failed for ${folder}`,
          this.ajv.errors
        );
        return null;
      }
    } else if (!manifest.id) {
      this.logger.warn(
        `PluginLoader: manifest missing id for ${folder}`
      );
      return null;
    }

    const id = manifest.id;

    const indexExists = await fs.access(indexPath)
      .then(() => true)
      .catch(() => false);

    const meta = {
      id,
      name: manifest.name || id,
      version: manifest.version || "1.0.0",
      folder,
      base,
      manifest,
      manifestPath,
      indexPath: indexExists ? indexPath : null,
      enabled: true,
      loadedAt: new Date()
    };

    // Register plugin metadata
    if (this.registry.register) {
      this.registry.register(id, meta);
    } else if (this.registry.registerPlugin) {
      this.registry.registerPlugin(id, meta);
    }

    // Register actions
    this._registerActionsForPlugin(id, base, manifest.actions);

    // Register WASM actions
    if (manifest.wasm && typeof manifest.wasm === "object") {
      this._registerWasmActions(id, base, manifest.wasm);
    }

    // Register hooks
    if (manifest.hooks && typeof manifest.hooks === "object") {
      this._registerHooks(id, base, manifest.hooks);
    }

    // Execute plugin entry if present
    if (meta.indexPath) {
      try {
        await this._executePluginEntry(meta);
        this.logger.info(`PluginLoader: executed entry for ${id}`);
      } catch (e) {
        this.logger.error(
          `PluginLoader: failed to execute index.js for ${id}: ${e.message}`
        );
      }
    }

    this.logger.info(`PluginLoader: loaded plugin ${id} from ${base}`);
    
    return meta;
  }

  /**
   * Execute plugin entry with proper cache clearing
   */
  async _executePluginEntry(meta) {
    const modulePath = meta.indexPath;
    
    // Clear require cache for this module and its dependencies
    this._clearModuleCache(modulePath);

    const entry = require(modulePath);

    if (typeof entry === "function") {
      await Promise.resolve(
        entry({
          app: this.app,
          registry: this.registry,
          logger: this.logger,
          plugin: meta
        })
      );
    }
  }

  /**
   * Properly clear require cache including dependencies
   */
  _clearModuleCache(modulePath) {
    try {
      const resolved = require.resolve(modulePath);
      const module = require.cache[resolved];

      if (module) {
        const pluginDir = path.dirname(modulePath);
        
        // Clear all children in plugin directory
        if (module.children) {
          module.children.forEach(child => {
            if (child.id.startsWith(pluginDir)) {
              delete require.cache[child.id];
            }
          });
        }

        // Clear the module itself
        delete require.cache[resolved];
      }
    } catch (err) {
      this.logger.warn(`Failed to clear cache for ${modulePath}: ${err.message}`);
    }
  }

  /**
   * Register JS actions
   */
  _registerActionsForPlugin(pluginId, basePath, actions) {
    if (!actions || typeof actions !== "object") return;

    for (const [actionName, def] of Object.entries(actions)) {
      let file, fnName, description, meta, runtime;

      if (typeof def === "string") {
        file = def;
      } else if (def.file) {
        file = def.file;
        fnName = def.fnName || null;
        description = def.description || null;
        meta = def.meta || null;
        runtime = def.runtime || (file && file.endsWith(".wasm") ? "wasm" : "js");
      } else {
        continue;
      }

      const fullPath = path.join(basePath, file);
      
      // Synchronous check for performance
      if (!fsSync.existsSync(fullPath)) {
        this.logger.warn(
          `Action file not found: ${pluginId}::${actionName} -> ${file}`
        );
        continue;
      }

      this.registry.registerAction(pluginId, actionName, {
        file,
        fnName,
        description,
        meta,
        runtime
      });
    }
  }

  /**
   * Register WASM actions
   */
  _registerWasmActions(pluginId, basePath, wasmActions) {
    for (const [actionName, def] of Object.entries(wasmActions)) {
      if (!def || !def.file) continue;

      const fullPath = path.join(basePath, def.file);
      
      if (!fsSync.existsSync(fullPath)) {
        this.logger.warn(
          `WASM file not found: ${pluginId}::${actionName} -> ${def.file}`
        );
        continue;
      }

      this.registry.registerAction(pluginId, actionName, {
        file: def.file,
        export: def.export || "run",
        description: def.description || null,
        meta: def.meta || null,
        runtime: "wasm",
        type: "wasm"
      });
    }
  }

  /**
   * Register hooks
   */
  _registerHooks(pluginId, basePath, hooks) {
    for (const [eventName, def] of Object.entries(hooks)) {
      if (!def || !def.action) continue;

      const actionRef = def.action;

      // If action is a file path, register as generated action
      if (actionRef.includes("/") || actionRef.endsWith(".js")) {
        const generatedAction = `__hook__${eventName.replace(/[^a-zA-Z0-9_]/g, "_")}`;

        this.registry.registerAction(pluginId, generatedAction, {
          file: actionRef,
          fnName: def.fnName || "run",
          description: def.description || `Hook for ${eventName}`,
          runtime: "js"
        });

        this.registry.registerHook(pluginId, eventName, generatedAction);
      } else {
        // Reference to existing action
        this.registry.registerHook(pluginId, eventName, actionRef);
      }
    }
  }

  /**
   * Sync registry atomically
   */
  _syncRegistry(plugins) {
    if (typeof this.registry.setAll === "function") {
      // Snapshot current actions before clearing
      const prevActions = this._snapshotActions();
      
      // Set new plugins
      this.registry.setAll(plugins);

      // Restore actions (they were re-registered during load)
      // This ensures no action loss during reload
      for (const [pid, actions] of Object.entries(prevActions)) {
        for (const [name, info] of Object.entries(actions)) {
          // Only restore if not already registered
          if (!this.registry.getAction(pid, name)) {
            this.registry.registerAction(pid, name, info);
          }
        }
      }
    }
  }

  /**
   * Snapshot all actions
   */
  _snapshotActions() {
    const out = {};
    if (!this.registry.actions) return out;

    for (const [pid, map] of this.registry.actions.entries()) {
      out[pid] = {};
      for (const [name, info] of map.entries()) {
        out[pid][name] = info;
      }
    }
    return out;
  }

  /**
   * Reload all plugins
   */
  async reload() {
    this.logger.info("PluginLoader: reloading plugins...");
    return this.loadAll();
  }
}

module.exports = PluginLoader;