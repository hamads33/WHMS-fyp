// src/modules/plugins/pluginEngine/loader.js
const fs = require("fs");
const path = require("path");
const registryFactory = require("./registry");

class PluginLoader {
  constructor({ pluginsDir, logger, ajv, registry, publicKeyPem } = {}) {
    this.pluginsDir = pluginsDir || path.join(process.cwd(), "plugins", "actions");
    this.logger = logger || console;
    this.ajv = ajv || null;
    this.registry = registry || registryFactory({ logger: this.logger });
    this.publicKeyPem = publicKeyPem;

    try {
      this.manifestSchema = require("../validators/manifest.schema");
    } catch (err) {
      this.manifestSchema = null;
    }
  }

  async loadAll() {
    const plugins = {};
    if (!fs.existsSync(this.pluginsDir)) {
      this.logger.info(`PluginLoader: no plugins directory at ${this.pluginsDir}`);
      if (this.registry.clear) this.registry.clear();
      return plugins;
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const dirent of entries) {
      if (!dirent.isDirectory()) continue;

      const folder = dirent.name;
      const base = path.join(this.pluginsDir, folder);
      const manifestPath = path.join(base, "manifest.json");
      const indexPath = path.join(base, "index.js");

      try {
        if (!fs.existsSync(manifestPath)) {
          this.logger.warn(`PluginLoader: skipping ${folder} (no manifest.json)`);
          continue;
        }

        let manifest;
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        } catch (err) {
          this.logger.error(`PluginLoader: bad manifest JSON for ${folder}: ${err.message}`);
          continue;
        }

        if (this.ajv && this.manifestSchema) {
          const isValid = this.ajv.validate(this.manifestSchema, manifest);
          if (!isValid) {
            this.logger.error(`Invalid manifest for ${folder}:`, this.ajv.errors);
            continue;
          }
        } else if (!manifest.id) {
          this.logger.warn(`PluginLoader: manifest missing id in ${folder}`);
          continue;
        }

        const id = manifest.id;

        if (plugins[id]) {
          this.logger.warn(`PluginLoader: duplicate plugin id "${id}" in ${folder}`);
          continue;
        }

        const meta = {
          id,
          name: manifest.name || id,
          version: manifest.version || "1.0.0",
          folder,
          base,
          manifestPath,
          indexPath: fs.existsSync(indexPath) ? indexPath : null,
          manifest
        };

        plugins[id] = meta;

        // register plugin
        if (this.registry.register) this.registry.register(id, meta);
        else this.registry.registerPlugin(id, meta);

        // register declared actions (existing behavior)
        this._registerActionsForPlugin(id, base, manifest.actions);

        // -------------------------
        // Hook support
        // -------------------------
        // manifest.hooks -> { "event.name": { "action": "someAction" } }
        // Allow two forms:
        // - action: "someActionName" (must match manifest.actions key)
        // - action: "hooks/onEvent.js" (file path relative to plugin root) -> loader will register a synthetic action name for it
        if (manifest.hooks && typeof manifest.hooks === "object") {
          for (const [eventName, def] of Object.entries(manifest.hooks)) {
            if (!def || !def.action) {
              this.logger.warn(`PluginLoader: invalid hook definition for ${id}:${eventName}`);
              continue;
            }

            const actionRef = def.action;
            if (actionRef.includes("/") || actionRef.endsWith(".js")) {
              // file path → register a generated action name
              const generatedActionName = `__hook__${eventName.replace(/[^a-zA-Z0-9_]/g, "_")}`;

              // register as an action so pluginEngine.runAction can execute it
              this.registry.registerAction(id, generatedActionName, {
                file: actionRef,
                fnName: def.fnName || "run",
                description: def.description || `(hook for ${eventName})`,
                meta: def.meta || null,
                runtime: "js"
              });

              // register hook mapping to the generated action name
              this.registry.registerHook(id, eventName, generatedActionName);
              this.logger.info(`PluginLoader: registered hook (file) ${id} -> ${eventName} -> ${generatedActionName}`);
            } else {
              // treat as action name (must exist in manifest.actions or will be resolved at runtime)
              const actionName = actionRef;
              this.registry.registerHook(id, eventName, actionName);
              this.logger.info(`PluginLoader: registered hook ${id} -> ${eventName} -> ${actionName}`);
            }
          }
        }

        // -------------------------
        // UI menu metadata: keep manifest.ui as-is
        // -------------------------
        // registry already stores manifest in plugin meta where admin UI can read it

        this.logger.info(`PluginLoader: loaded plugin ${id} from ${base}`);
      } catch (err) {
        this.logger.error(`PluginLoader: failed to load plugin folder ${folder}: ${err.stack}`);
      }
    }

    // restore actions if registry.setAll cleared them earlier (keeps prior behavior)
    this._syncRegistry(plugins);
    return plugins;
  }
async reload() {
  this.logger.info("PluginLoader: reloading plugins...");
  return await this.loadAll();
}

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
        this.logger.warn(`PluginLoader: invalid action definition for ${pluginId}:${actionName}`);
        continue;
      }

      const fullPath = path.join(basePath, file);
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`PluginLoader: action file missing for ${pluginId}:${actionName} → ${fullPath}`);
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

  _syncRegistry(plugins) {
    if (typeof this.registry.setAll === "function") {
      const previousActions = this._snapshotActions();
      this.registry.setAll(plugins); // replaces plugin list

      // restore actions
      for (const [pluginId, actions] of Object.entries(previousActions)) {
        for (const [actionName, info] of Object.entries(actions)) {
          this.registry.registerAction(pluginId, actionName, info);
        }
      }
    } else {
      if (this.registry.plugins) {
        this.registry.plugins.clear();
        for (const [id, meta] of Object.entries(plugins)) {
          this.registry.plugins.set(id, meta);
        }
      }
    }
  }

  _snapshotActions() {
    const out = {};
    if (!this.registry.actions) return out;
    for (const [pluginId, map] of this.registry.actions.entries()) {
      out[pluginId] = {};
      for (const [name, info] of map.entries()) {
        out[pluginId][name] = info;
      }
    }
    return out;
  }
}

module.exports = PluginLoader;
