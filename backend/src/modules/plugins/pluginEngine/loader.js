// src/modules/plugins/pluginEngine/loader.js
/**
 * PluginLoader
 *
 * Responsibilities:
 *  - Read plugins directory (plugins/actions by default)
 *  - Validate manifest.json using AJV instance passed in
 *  - Prepare metadata for each plugin (id, name, version, base, manifestPath, indexPath, manifest)
 *  - Register plugins into the shared registry
 *
 * Notes:
 *  - This loader does NOT execute plugin code. Execution should be done in a sandbox (vm2) by the executor.
 *  - The loader is defensive: a single invalid plugin will be skipped and logged, not crash the whole loader.
 */

const fs = require("fs");
const path = require("path");
const registry = require("./registry");

class PluginLoader {
  /**
   * @param {Object} options
   * @param {string} options.pluginsDir - absolute or relative path to plugins directory (default: <cwd>/plugins/actions)
   * @param {Console|Object} options.logger - logger with .info/.warn/.error (defaults to console)
   * @param {Ajv} options.ajv - AJV instance for manifest validation (required)
   */
  constructor({ pluginsDir, logger, ajv } = {}) {
    this.pluginsDir = pluginsDir || path.join(process.cwd(), "plugins", "actions");
    this.logger = logger || console;
    if (!ajv) {
      this.logger.warn("PluginLoader: no Ajv instance passed — manifest validation will be skipped");
    }
    this.ajv = ajv;
    // load manifest schema from validators (if exists)
    try {
      // relative to this loader file
      this.manifestSchema = require("../validators/manifest.schema");
    } catch (e) {
      this.manifestSchema = null;
    }
  }

  /**
   * Load all plugins from disk and register them in the registry.
   * Returns the map of registered plugins.
   */
  async loadAll() {
    const plugins = {};

    if (!fs.existsSync(this.pluginsDir)) {
      this.logger.info(`PluginLoader: plugins directory not found at ${this.pluginsDir} — nothing to load`);
      registry.clear();
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
          this.logger.warn(`PluginLoader: skipping ${folder} — manifest.json not found`);
          continue;
        }
        if (!fs.existsSync(indexPath)) {
          this.logger.warn(`PluginLoader: skipping ${folder} — index.js not found`);
          continue;
        }

        const raw = fs.readFileSync(manifestPath, "utf8");
        let manifest;
        try {
          manifest = JSON.parse(raw);
        } catch (err) {
          this.logger.error(`PluginLoader: invalid JSON in manifest for ${folder}: ${err.message}`);
          continue;
        }

        // Validate manifest via AJV if provided and schema exists
        if (this.ajv && this.manifestSchema) {
          const valid = this.ajv.validate(this.manifestSchema, manifest);
          if (!valid) {
            this.logger.error(`Invalid manifest for ${folder}:`, this.ajv.errors || this.ajv.errorsText?.() || "validation failed");
            continue;
          }
        } else {
          // Basic sanity: ensure id exists
          if (!manifest.id) {
            this.logger.warn(`PluginLoader: manifest missing 'id' for folder ${folder} — skipping`);
            continue;
          }
        }

        // Ensure manifest.id is unique
        const id = manifest.id;
        if (plugins[id]) {
          this.logger.warn(`PluginLoader: duplicate plugin id '${id}' in folder ${folder} — skipping`);
          continue;
        }

        // Build plugin metadata
        const meta = {
          id,
          name: manifest.name || id,
          version: manifest.version || "0.0.0",
          folder,
          base,
          manifestPath,
          indexPath,
          manifest
        };

        // Register in our local map and in the shared registry
        plugins[id] = meta;
        registry.register(id, meta);

        this.logger.info(`PluginLoader: loaded plugin ${id} from ${base}`);
      } catch (err) {
        // Defensive: log and continue
        this.logger.error(`PluginLoader: failed to load plugin at ${base}:`, err.stack || err.message || err);
      }
    } // end for

    // Finalize registry (ensure registry matches what we loaded)
    registry.setAll(plugins);

    return plugins;
  }

  /**
   * Helper to load a single plugin (useful for post-install reload).
   * Returns metadata or throws.
   */
  async loadPluginFolder(folderName) {
    const full = path.join(this.pluginsDir, folderName);
    if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
      throw new Error(`Plugin folder not found: ${folderName}`);
    }

    const manifestPath = path.join(full, "manifest.json");
    const indexPath = path.join(full, "index.js");
    if (!fs.existsSync(manifestPath) || !fs.existsSync(indexPath)) {
      throw new Error("manifest.json or index.js missing in plugin folder");
    }

    const raw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(raw);

    if (this.ajv && this.manifestSchema) {
      const valid = this.ajv.validate(this.manifestSchema, manifest);
      if (!valid) {
        throw new Error(`Invalid manifest: ${JSON.stringify(this.ajv.errors)}`);
      }
    } else if (!manifest.id) {
      throw new Error("manifest.id missing");
    }

    const id = manifest.id;
    const meta = {
      id,
      name: manifest.name || id,
      version: manifest.version || "0.0.0",
      folder: folderName,
      base: full,
      manifestPath,
      indexPath,
      manifest
    };

    registry.register(id, meta);
    // refresh registry listing
    const current = registry.list().reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
    registry.setAll(current);

    return meta;
  }
}

module.exports = PluginLoader;
