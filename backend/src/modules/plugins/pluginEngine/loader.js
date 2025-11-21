// /**
//  * PluginLoader (Regenerated & Fixed)
//  *
//  * Responsibilities:
//  *  - Read plugins/*/manifest.json
//  *  - Validate manifest with AJV + schema (if available)
//  *  - Register plugin metadata
//  *  - Register plugin actions (manifest.actions)
//  *  - KEEP actions after registry.setAll() (CRITICAL FIX)
//  *
//  * Notes:
//  *  - index.js is optional (UI only plugins supported)
//  *  - Action files must exist, or they are skipped safely
//  *  - Will never crash plugin module
//  */

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

    // load manifest schema if exists
    try {
      this.manifestSchema = require("../validators/manifest.schema");
    } catch (err) {
      this.manifestSchema = null;
    }
  }

  /**
   * Load ALL plugins
   */
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

        // read manifest.json
        let manifest;
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        } catch (err) {
          this.logger.error(`PluginLoader: bad manifest JSON for ${folder}: ${err.message}`);
          continue;
        }

        // validate manifest
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

        // plugin metadata
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

        // register declared actions
        this._registerActionsForPlugin(id, base, manifest.actions);

        this.logger.info(`PluginLoader: loaded plugin ${id} from ${base}`);
      } catch (err) {
        this.logger.error(`PluginLoader: failed to load plugin folder ${folder}: ${err.stack}`);
      }
    }

    // critical fix: registry.setAll wipes actions, so restore afterwards
    this._syncRegistry(plugins);

    return plugins;
  }

  /**
   * Register all actions from manifest
   */
  _registerActionsForPlugin(pluginId, basePath, actions) {
    if (!actions || typeof actions !== "object") return;

    for (const [actionName, def] of Object.entries(actions)) {
      let file, fnName, description, meta;

      // action definitions support:
      // "ping.js"
      // { file, fnName, description, meta }
      if (typeof def === "string") {
        file = def;
      } else if (def.file) {
        file = def.file;
        fnName = def.fnName || null;
        description = def.description || null;
        meta = def.meta || null;
      } else {
        this.logger.warn(`PluginLoader: invalid action definition for ${pluginId}:${actionName}`);
        continue;
      }

      const fullPath = path.join(basePath, file);
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(
          `PluginLoader: action file missing for ${pluginId}:${actionName} → ${fullPath}`
        );
        continue;
      }

      // register action
      this.registry.registerAction(pluginId, actionName, {
        file,
        fnName,
        description,
        meta
      });
    }
  }

  /**
   * Sync plugin list into registry without removing actions.
   * registry.setAll normally clears everything → we must reapply actions.
   */
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
      // fallback: direct write into registry map if exists
      if (this.registry.plugins) {
        this.registry.plugins.clear();
        for (const [id, meta] of Object.entries(plugins)) {
          this.registry.plugins.set(id, meta);
        }
      }
    }
  }

  /**
   * Take snapshot of existing actions BEFORE registry.setAll clears them.
   */
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
