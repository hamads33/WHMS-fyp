// src/modules/plugins/pluginEngine/loader.js
// Stable loader with safe defaults and atomic registry sync

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
    this.pluginsDir =
      pluginsDir || path.join(process.cwd(), "plugins", "actions");
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
   * Load all plugins from filesystem (single source of truth)
   */
  async loadAll() {
    const plugins = {};

    try {
      const dirExists = await fs
        .access(this.pluginsDir)
        .then(() => true)
        .catch(() => false);

      if (!dirExists) {
        this.logger.info(
          `PluginLoader: no plugins directory at ${this.pluginsDir}`
        );
        if (this.registry.clear) this.registry.clear();
        return plugins;
      }

      const entries = await fs.readdir(this.pluginsDir, {
        withFileTypes: true
      });

      for (const dirent of entries) {
        if (!dirent.isDirectory()) continue;

        const folder = dirent.name;

        // Validate folder name
        if (!PLUGIN_ID_REGEX.test(folder)) {
          this.logger.warn(
            `PluginLoader: skipping "${folder}" (invalid plugin ID format)`
          );
          continue;
        }

        const basePath = path.join(this.pluginsDir, folder);

        try {
          const plugin = await this._loadPlugin(folder, basePath);
          if (!plugin) continue;

          // Validate identity
          if (!plugin.id || plugin.id !== folder) {
            this.logger.error(
              `PluginLoader: plugin ID mismatch (folder="${folder}", id="${plugin?.id}")`
            );
            continue;
          }

          // Prevent duplicates
          if (plugins[plugin.id]) {
            this.logger.error(
              `PluginLoader: duplicate plugin ID "${plugin.id}" detected`
            );
            continue;
          }

          // ✅ REQUIRED NORMALIZATION
          plugin.enabled = plugin.enabled ?? true;
          plugin.loadedAt = plugin.loadedAt ?? new Date();
          plugin.config = plugin.config ?? {};

          plugins[plugin.id] = plugin;

          this.logger.info(
            `PluginLoader: loaded "${plugin.id}" successfully`
          );
        } catch (err) {
          this.logger.error(
            `PluginLoader: failed to load "${folder}": ${
              err.stack || err.message
            }`
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

    const manifestExists = await fs
      .access(manifestPath)
      .then(() => true)
      .catch(() => false);

    if (!manifestExists) {
      this.logger.warn(
        `PluginLoader: skipping ${folder} (no manifest.json)`
      );
      return null;
    }

    let manifest;
    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch (err) {
      this.logger.error(
        `PluginLoader: invalid manifest.json for ${folder}: ${err.message}`
      );
      return null;
    }

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
      return null;
    }

    const id = manifest.id;

    const meta = {
      id,
      name: manifest.name || id,
      version: manifest.version || "1.0.0",
      folder,
      base,
      manifest,
      indexPath: fsSync.existsSync(indexPath) ? indexPath : null,
      enabled: true,
      loadedAt: new Date()
    };

    // Register metadata
    if (this.registry.register) {
      this.registry.register(id, meta);
    } else if (this.registry.registerPlugin) {
      this.registry.registerPlugin(id, meta);
    }

    // Register actions
    this._registerActionsForPlugin(id, base, manifest.actions);

    if (manifest.wasm) {
      this._registerWasmActions(id, base, manifest.wasm);
    }

    if (manifest.hooks) {
      this._registerHooks(id, base, manifest.hooks);
    }

    // Execute entry file if present
    if (meta.indexPath) {
      this._clearModuleCache(meta.indexPath);
      const entry = require(meta.indexPath);
      if (typeof entry === "function") {
        await entry({
          app: this.app,
          registry: this.registry,
          logger: this.logger,
          plugin: meta
        });
      }
    }

    return meta;
  }

  _clearModuleCache(modulePath) {
    try {
      const resolved = require.resolve(modulePath);
      delete require.cache[resolved];
    } catch (_) {}
  }

  _registerActionsForPlugin(pluginId, basePath, actions) {
    if (!actions) return;

    for (const [name, def] of Object.entries(actions)) {
      const file = typeof def === "string" ? def : def.file;
      if (!file) continue;

      const fullPath = path.join(basePath, file);
      if (!fsSync.existsSync(fullPath)) continue;

      this.registry.registerAction(pluginId, name, {
        file,
        fnName: def.fnName || "run",
        runtime:
          def.runtime || (file.endsWith(".wasm") ? "wasm" : "js"),
        description: def.description || null,
        meta: def.meta || null
      });
    }
  }

  _registerWasmActions(pluginId, basePath, wasmActions) {
    for (const [name, def] of Object.entries(wasmActions || {})) {
      if (!def.file) continue;

      const fullPath = path.join(basePath, def.file);
      if (!fsSync.existsSync(fullPath)) continue;

      this.registry.registerAction(pluginId, name, {
        file: def.file,
        export: def.export || "run",
        runtime: "wasm",
        type: "wasm"
      });
    }
  }

  _registerHooks(pluginId, basePath, hooks) {
    for (const [event, def] of Object.entries(hooks || {})) {
      if (!def.action) continue;
      this.registry.registerHook(pluginId, event, def.action);
    }
  }

  _syncRegistry(plugins) {
    if (typeof this.registry.setAll === "function") {
      this.registry.setAll(plugins);
    }
  }

  async reload() {
    this.logger.info("PluginLoader: reloading plugins...");
    return this.loadAll();
  }
}

module.exports = PluginLoader;
