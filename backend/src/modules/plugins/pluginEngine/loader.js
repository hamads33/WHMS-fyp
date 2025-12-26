const fs = require("fs");
const path = require("path");
const registryFactory = require("./registry");

class PluginLoader {
  constructor({
    pluginsDir,
    logger,
    ajv,
    registry,
    publicKeyPem,
    app // 👈 IMPORTANT: injected once, used by all plugins
  } = {}) {
    this.pluginsDir =
      pluginsDir || path.join(process.cwd(), "plugins", "actions");
    this.logger = logger || console;
    this.ajv = ajv || null;
    this.registry = registry || registryFactory({ logger: this.logger });
    this.publicKeyPem = publicKeyPem;
    this.app = app;

    try {
      this.manifestSchema = require("../validators/manifest.schema");
    } catch {
      this.manifestSchema = null;
    }
  }

  // ======================================================
  // LOAD ALL PLUGINS
  // ======================================================
  async loadAll() {
    const plugins = {};

    if (!fs.existsSync(this.pluginsDir)) {
      this.logger.info(
        `PluginLoader: no plugins directory at ${this.pluginsDir}`
      );
      if (this.registry.clear) this.registry.clear();
      return plugins;
    }

    const entries = fs.readdirSync(this.pluginsDir, {
      withFileTypes: true
    });

    for (const dirent of entries) {
      if (!dirent.isDirectory()) continue;

      const folder = dirent.name;
      const base = path.join(this.pluginsDir, folder);
      const manifestPath = path.join(base, "manifest.json");
      const indexPath = path.join(base, "index.js");

      try {
        // --------------------------------------------------
        // MANIFEST
        // --------------------------------------------------
        if (!fs.existsSync(manifestPath)) {
          this.logger.warn(
            `PluginLoader: skipping ${folder} (no manifest.json)`
          );
          continue;
        }

        let manifest;
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        } catch (err) {
          this.logger.error(
            `PluginLoader: invalid manifest.json for ${folder}: ${err.message}`
          );
          continue;
        }

        if (this.ajv && this.manifestSchema) {
          const valid = this.ajv.validate(this.manifestSchema, manifest);
          if (!valid) {
            this.logger.error(
              `PluginLoader: manifest validation failed for ${folder}`,
              this.ajv.errors
            );
            continue;
          }
        } else if (!manifest.id) {
          this.logger.warn(
            `PluginLoader: manifest missing id for ${folder}`
          );
          continue;
        }

        const id = manifest.id;
        if (plugins[id]) {
          this.logger.warn(
            `PluginLoader: duplicate plugin id "${id}"`
          );
          continue;
        }

        const meta = {
          id,
          name: manifest.name || id,
          version: manifest.version || "1.0.0",
          folder,
          base,
          manifest,
          manifestPath,
          indexPath: fs.existsSync(indexPath) ? indexPath : null
        };

        plugins[id] = meta;

        // --------------------------------------------------
        // REGISTER PLUGIN METADATA (existing behavior)
        // --------------------------------------------------
        if (this.registry.register) {
          this.registry.register(id, meta);
        } else if (this.registry.registerPlugin) {
          this.registry.registerPlugin(id, meta);
        }

        // --------------------------------------------------
        // REGISTER MANIFEST ACTIONS (existing behavior)
        // --------------------------------------------------
        this._registerActionsForPlugin(id, base, manifest.actions);

        // --------------------------------------------------
        // REGISTER HOOKS (existing behavior)
        // --------------------------------------------------
        if (manifest.hooks && typeof manifest.hooks === "object") {
          for (const [eventName, def] of Object.entries(manifest.hooks)) {
            if (!def || !def.action) continue;

            const actionRef = def.action;

            if (actionRef.includes("/") || actionRef.endsWith(".js")) {
              const generatedAction = `__hook__${eventName.replace(
                /[^a-zA-Z0-9_]/g,
                "_"
              )}`;

              this.registry.registerAction(id, generatedAction, {
                file: actionRef,
                fnName: def.fnName || "run",
                description:
                  def.description || `(hook for ${eventName})`,
                runtime: "js"
              });

              this.registry.registerHook(
                id,
                eventName,
                generatedAction
              );
            } else {
              this.registry.registerHook(id, eventName, actionRef);
            }
          }
        }

        // --------------------------------------------------
        // EXECUTE PLUGIN ENTRY (NEW – CRITICAL)
        // --------------------------------------------------
        if (meta.indexPath) {
          try {
            delete require.cache[require.resolve(meta.indexPath)];
            const entry = require(meta.indexPath);

            if (typeof entry === "function") {
              entry({
                app: this.app,
                registry: this.registry,
                logger: this.logger,
                plugin: meta
              });

              this.logger.info(
                `PluginLoader: executed entry for ${id}`
              );
            }
          } catch (e) {
            this.logger.error(
              `PluginLoader: failed to execute index.js for ${id}: ${e.message}`
            );
          }
        }

        this.logger.info(
          `PluginLoader: loaded plugin ${id} from ${base}`
        );
      } catch (err) {
        this.logger.error(
          `PluginLoader: failed to load ${folder}: ${err.stack}`
        );
      }
    }

    // --------------------------------------------------
    // KEEP EXISTING REGISTRY BEHAVIOR
    // --------------------------------------------------
    this._syncRegistry(plugins);
    return plugins;
  }

  async reload() {
    this.logger.info("PluginLoader: reloading plugins...");
    return this.loadAll();
  }

  // ======================================================
  // INTERNAL HELPERS (UNCHANGED)
  // ======================================================
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
        runtime =
          def.runtime ||
          (file && file.endsWith(".wasm") ? "wasm" : "js");
      } else {
        continue;
      }

      const fullPath = path.join(basePath, file);
      if (!fs.existsSync(fullPath)) continue;

      this.registry.registerAction(pluginId, actionName, {
        file,
        fnName,
        description,
        meta,
        runtime
      });
    }
  }

  _syncRegistry(plugins) {
    if (typeof this.registry.setAll === "function") {
      const prev = this._snapshotActions();
      this.registry.setAll(plugins);

      for (const [pid, actions] of Object.entries(prev)) {
        for (const [name, info] of Object.entries(actions)) {
          this.registry.registerAction(pid, name, info);
        }
      }
    }
  }

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
}

module.exports = PluginLoader;
