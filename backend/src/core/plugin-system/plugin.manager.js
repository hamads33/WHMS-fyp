/**
 * plugin.manager.js
 * ------------------------------------------------------------------
 * Discovers, loads, registers, and boots all plugins.
 *
 * Plugin discovery:
 *   Scans src/plugins/ for subdirectories that contain a plugin.js file.
 *   Each plugin.js must export a valid plugin object (see plugin.interface.js).
 *
 * Lifecycle order:
 *   1. load()     — require() every plugin.js
 *   2. register() — call plugin.register(ctx) for every loaded plugin
 *   3. boot()     — call plugin.boot(ctx) for every registered plugin
 *   4. shutdown() — call plugin.shutdown(ctx) on graceful stop
 *
 * ctx provided to each plugin:
 *   { services, events, hooks, config, app, prisma, logger }
 */

const fs     = require("fs");
const path   = require("path");
const semver = require("semver");

const { validatePlugin, SUPPORTED_CAPABILITIES } = require("./plugin.interface");
const serviceContainer     = require("./service.container");
const eventBus             = require("./event.bus");
const hookRegistry         = require("./hook.registry");
const pluginConfigStore    = require("./plugin.config.store");
const pluginState          = require("./plugin-state.service");

// Plugins live in src/plugins/ relative to this repo
const PLUGINS_DIR = path.resolve(__dirname, "../../plugins");

class PluginManager {
  /**
   * @param {object} opts
   * @param {object} opts.app     - Express app instance
   * @param {object} opts.prisma  - Prisma client
   * @param {object} opts.logger  - Logger (defaults to console)
   */
  constructor({ app, prisma, logger = console } = {}) {
    this.app    = app;
    this.prisma = prisma;
    this.logger = logger;

    // Registry of loaded plugins: name → { meta, plugin, ctx }
    this._plugins = new Map();
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * loadAll
   * Discover all plugins in PLUGINS_DIR, validate them, and store them.
   * Does NOT call register() or boot() — call those separately.
   */
  async loadAll() {
    if (!fs.existsSync(PLUGINS_DIR)) {
      this.logger.warn(`[PluginManager] Plugins directory not found: ${PLUGINS_DIR}`);
      return;
    }

    const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pluginFile = path.join(PLUGINS_DIR, entry.name, "plugin.js");

      if (!fs.existsSync(pluginFile)) {
        this.logger.warn(`[PluginManager] Skipping "${entry.name}": no plugin.js found`);
        continue;
      }

      try {
        const plugin = require(pluginFile);
        validatePlugin(plugin, entry.name);

        // Attach package.json so checkDependencies can read plugin.dependencies
        const pkgFile = path.join(PLUGINS_DIR, entry.name, "package.json");
        if (fs.existsSync(pkgFile)) {
          try { plugin._packageJson = JSON.parse(fs.readFileSync(pkgFile, "utf8")); } catch (_) {}
        }

        const capabilities = plugin.meta.capabilities ?? [];
        const unsupported  = capabilities.filter(c => !SUPPORTED_CAPABILITIES.includes(c));
        if (unsupported.length) {
          this.logger.warn(
            `[PluginManager] Plugin "${plugin.meta.name}" declares unsupported capabilities: ${unsupported.join(", ")}`
          );
        }

        const permissions = plugin.meta.permissions ?? [];
        const ui          = plugin.meta.ui ?? null;
        this._plugins.set(plugin.meta.name, { meta: plugin.meta, plugin, ctx: null, capabilities, permissions, ui });
        pluginState.markInstalled(plugin.meta.name);
        this.logger.info(
          `[PluginManager] Loaded plugin: ${plugin.meta.name} v${plugin.meta.version}` +
          `${capabilities.length ? ` [caps: ${capabilities.join(", ")}]` : ""}` +
          `${permissions.length ? ` [perms: ${permissions.join(", ")}]` : ""}` +
          `${ui?.adminPages?.length ? ` [ui pages: ${ui.adminPages.map(p => p.id).join(", ")}]` : ""}`
        );
      } catch (err) {
        this.logger.error(`[PluginManager] Failed to load plugin "${entry.name}": ${err.message}`);
      }
    }

    this.logger.info(`[PluginManager] ${this._plugins.size} plugin(s) loaded`);
  }

  /**
   * registerAll
   * Call plugin.register(ctx) for every loaded plugin.
   * This is where plugins register services, hooks, routes, etc.
   */
  async registerAll() {
    for (const [name, entry] of this._plugins) {
      const ctx = this._buildContext(name);
      entry.ctx = ctx;

      try {
        if (typeof entry.plugin.register !== "function") {
          throw new Error(`plugin.register() is not a function (got ${typeof entry.plugin.register})`);
        }
        await Promise.resolve(entry.plugin.register(ctx));
        this.logger.info(`[PluginManager] Registered: ${name}`);
      } catch (err) {
        this.logger.error(`[PluginManager] register() failed for "${name}": ${err.message}`);
      }
    }
  }

  /**
   * bootAll
   * Call plugin.boot(ctx) for every registered plugin.
   * Skips any plugin whose dependencies are not satisfied.
   */
  async bootAll() {
    for (const [name, entry] of this._plugins) {
      if (!entry.ctx) continue; // skipped during register

      const { ok, errors } = this.checkDependencies(entry.plugin);
      if (!ok) {
        this.logger.warn(
          `[PluginManager] Skipping boot of "${name}" — unmet dependencies: ${errors.join("; ")}`
        );
        continue;
      }

      try {
        if (typeof entry.plugin.boot !== "function") {
          throw new Error(`plugin.boot() is not a function (got ${typeof entry.plugin.boot})`);
        }
        await Promise.resolve(entry.plugin.boot(entry.ctx));
        this.logger.info(`[PluginManager] Booted: ${name}`);
      } catch (err) {
        this.logger.error(`[PluginManager] boot() failed for "${name}": ${err.message}`);
      }
    }
  }

  /**
   * shutdownAll
   * Call plugin.shutdown(ctx) for every plugin (graceful stop).
   * Called when the process receives SIGTERM/SIGINT.
   */
  async shutdownAll() {
    for (const [name, entry] of this._plugins) {
      if (!entry.ctx) continue;

      try {
        if (typeof entry.plugin.shutdown !== "function") {
          this.logger.debug(`[PluginManager] Plugin "${name}" has no shutdown() method — skipping`);
          continue;
        }
        await Promise.resolve(entry.plugin.shutdown(entry.ctx));
        this.logger.info(`[PluginManager] Shutdown: ${name}`);
      } catch (err) {
        this.logger.error(`[PluginManager] shutdown() failed for "${name}": ${err.message}`);
      }
    }
  }

  /**
   * loadPluginFromPath
   * Hot-load a single plugin from a given folder path.
   * Called by the installer after extracting a new plugin zip.
   * Runs the full register → boot lifecycle for that plugin only.
   *
   * @param {string} folderPath  - Absolute path to the plugin folder
   */
  async loadPluginFromPath(folderPath) {
    const pluginFile = require("path").join(folderPath, "plugin.js");

    if (!require("fs").existsSync(pluginFile)) {
      throw new Error(`loadPluginFromPath: no plugin.js found in ${folderPath}`);
    }

    // Clear require cache so we always get the fresh version
    delete require.cache[require.resolve(pluginFile)];
    const plugin = require(pluginFile);

    const { validatePlugin } = require("./plugin.interface");
    validatePlugin(plugin, folderPath);

    // Skip if already loaded under this name
    if (this._plugins.has(plugin.meta.name)) {
      this.logger.warn(`[PluginManager] Plugin "${plugin.meta.name}" already loaded — skipping hot-load`);
      return;
    }

    // Attach package.json for dependency resolution
    const pkgFile = path.join(folderPath, "package.json");
    if (fs.existsSync(pkgFile)) {
      try { plugin._packageJson = JSON.parse(fs.readFileSync(pkgFile, "utf8")); } catch (_) {}
    }

    const capabilities = plugin.meta.capabilities ?? [];
    const unsupported  = capabilities.filter(c => !SUPPORTED_CAPABILITIES.includes(c));
    if (unsupported.length) {
      this.logger.warn(
        `[PluginManager] Plugin "${plugin.meta.name}" declares unsupported capabilities: ${unsupported.join(", ")}`
      );
    }

    const permissions = plugin.meta.permissions ?? [];
    const ui          = plugin.meta.ui ?? null;
    this._plugins.set(plugin.meta.name, { meta: plugin.meta, plugin, ctx: null, capabilities, permissions, ui });
    pluginState.markInstalled(plugin.meta.name);

    const ctx = this._buildContext(plugin.meta.name);
    this._plugins.get(plugin.meta.name).ctx = ctx;

    if (typeof plugin.register !== "function") {
      throw new Error(`Hot-load failed: plugin.register() is not a function (got ${typeof plugin.register})`);
    }
    await Promise.resolve(plugin.register(ctx));

    const { ok, errors } = this.checkDependencies(plugin);
    if (!ok) {
      this.logger.warn(
        `[PluginManager] Skipping boot of "${plugin.meta.name}" — unmet dependencies: ${errors.join("; ")}`
      );
      return;
    }

    if (typeof plugin.boot !== "function") {
      throw new Error(`Hot-load failed: plugin.boot() is not a function (got ${typeof plugin.boot})`);
    }
    await Promise.resolve(plugin.boot(ctx));
    this.logger.info(`[PluginManager] Hot-loaded plugin: ${plugin.meta.name} v${plugin.meta.version}${capabilities.length ? ` [${capabilities.join(", ")}]` : ""}`);
  }

  /**
   * init
   * Convenience method: loadAll → registerAll → bootAll in one call.
   */
  async init() {
    await this.loadAll();
    await this.registerAll();
    await this.bootAll();
    this.logger.info(`[PluginManager] All plugins initialized`);
  }

  /**
   * list
   * Returns metadata for every loaded plugin.
   *
   * @returns {{ name, version, description, capabilities }[]}
   */
  list() {
    return [...this._plugins.values()].map((e) => ({
      ...e.meta,
      capabilities: e.capabilities,
      permissions : e.permissions,
      ui          : e.ui,
    }));
  }

  /**
   * getPluginUiManifest
   * Returns the UI manifest for all enabled plugins that contribute UI.
   * Includes adminPages (sidebar pages), settingsTabs (custom settings panels),
   * and configSchema (auto-generated settings form fields).
   *
   * @returns {{ plugin, displayName, pages, settingsTabs, configSchema }[]}
   */
  getPluginUiManifest() {
    const manifest = [];
    for (const [name, entry] of this._plugins) {
      if (!pluginState.isEnabled(name)) continue;

      const hasUiCap = entry.capabilities.includes("ui");

      const pages = hasUiCap
        ? (entry.ui?.adminPages ?? []).map(p => ({
            id    : p.id,
            label : p.label,
            icon  : p.icon ?? "layout-dashboard",
            url   : `/api/plugins/${name}/ui-data/${p.id}`,
          }))
        : [];

      const settingsTabs = hasUiCap
        ? (entry.ui?.settingsTabs ?? []).map(t => ({
            id   : t.id,
            label: t.label,
            icon : t.icon ?? "settings",
          }))
        : [];

      const configSchema = entry.meta.configSchema ?? [];

      if (pages.length || settingsTabs.length || configSchema.length) {
        manifest.push({
          plugin      : name,
          displayName : entry.meta.displayName ?? name,
          pages,
          settingsTabs,
          configSchema,
        });
      }
    }
    return manifest;
  }

  /**
   * getMaskedPluginConfig
   * Returns config for a plugin with password fields replaced by a placeholder.
   *
   * @param  {string} pluginName
   * @returns {object}
   */
  getMaskedPluginConfig(pluginName) {
    const config = pluginConfigStore.getAll(pluginName);
    const schema = this._plugins.get(pluginName)?.meta?.configSchema ?? [];
    const masked = { ...config };
    for (const field of schema) {
      if (field.type === "password" && masked[field.key]) {
        masked[field.key] = "••••••••";
      }
    }
    return masked;
  }

  /**
   * updatePluginConfig
   * Merges updates into the plugin's config, ignoring masked password placeholders.
   *
   * @param  {string} pluginName
   * @param  {object} updates
   * @returns {{ ok: boolean, error?: string }}
   */
  updatePluginConfig(pluginName, updates) {
    if (!this._plugins.has(pluginName)) {
      return { ok: false, error: `Plugin "${pluginName}" not found` };
    }
    const existing    = pluginConfigStore.getAll(pluginName);
    const schema      = this._plugins.get(pluginName)?.meta?.configSchema ?? [];
    const passwordKeys = new Set(schema.filter(f => f.type === "password").map(f => f.key));

    for (const [key, val] of Object.entries(updates)) {
      if (passwordKeys.has(key) && val === "••••••••") continue;
      existing[key] = val;
    }
    pluginConfigStore.setAll(pluginName, existing);
    return { ok: true };
  }

  /**
   * checkDependencies
   * Reads plugin.dependencies from the plugin's package.json (if any) and
   * verifies each required plugin is loaded and satisfies the semver range.
   *
   * package.json shape:
   *   { "plugin": { "dependencies": { "billing-core": "^1.0.0" } } }
   *
   * @param  {object} plugin  - The plugin module export
   * @returns {{ ok: boolean, errors: string[] }}
   */
  checkDependencies(plugin) {
    const errors = [];

    // Read plugin-level dependencies from package.json if present
    const pkgDeps = plugin._packageJson?.plugin?.dependencies ?? plugin.meta?.pluginDependencies ?? {};

    for (const [depName, range] of Object.entries(pkgDeps)) {
      const dep = this._plugins.get(depName);

      if (!dep) {
        errors.push(`"${depName}" is not loaded`);
        continue;
      }

      if (!semver.satisfies(dep.meta.version, range)) {
        errors.push(`"${depName}" v${dep.meta.version} does not satisfy required range "${range}"`);
      }
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * getPluginCapabilities
   * Returns the declared capabilities for a plugin, or [] if not found.
   *
   * @param  {string} pluginName
   * @returns {string[]}
   */
  getPluginCapabilities(pluginName) {
    return this._plugins.get(pluginName)?.capabilities ?? [];
  }

  /**
   * getPluginsWithCapability
   * Returns names of all plugins that declare a given capability.
   *
   * @param  {string} capability  - e.g. "billing", "cron"
   * @returns {string[]}
   */
  /**
   * getPluginPermissions
   * Returns the declared permissions for a plugin, or [] if not found.
   * NOTE: permissions are declarative only — not enforced yet.
   *
   * @param  {string} pluginName
   * @returns {string[]}
   */
  getPluginPermissions(pluginName) {
    return this._plugins.get(pluginName)?.permissions ?? [];
  }

  getPluginsWithCapability(capability) {
    return [...this._plugins.entries()]
      .filter(([, e]) => e.capabilities.includes(capability))
      .map(([name]) => name);
  }

  // ----------------------------------------------------------------
  // Enable / Disable
  // ----------------------------------------------------------------

  /**
   * enablePlugin
   * Re-enables a previously disabled plugin so its hooks fire again.
   *
   * @param  {string} name
   * @returns {{ ok: boolean, message?: string }}
   */
  enablePlugin(name) {
    const result = pluginState.enable(name);
    if (result.ok) {
      this.logger.info(`[PluginManager] Plugin enabled: ${name}`);
    } else {
      this.logger.warn(`[PluginManager] enablePlugin failed: ${result.message}`);
    }
    return result;
  }

  /**
   * disablePlugin
   * Disables a plugin without removing its files or unregistering its hooks.
   * Hook handlers from this plugin will be silently skipped during trigger().
   *
   * @param  {string} name
   * @returns {{ ok: boolean, message?: string }}
   */
  disablePlugin(name) {
    const result = pluginState.disable(name);
    if (result.ok) {
      this.logger.info(`[PluginManager] Plugin disabled: ${name}`);
    } else {
      this.logger.warn(`[PluginManager] disablePlugin failed: ${result.message}`);
    }
    return result;
  }

  /**
   * listEnabledPlugins
   * Returns metadata for every currently enabled plugin.
   *
   * @returns {{ name, version, description, capabilities }[]}
   */
  listEnabledPlugins() {
    const enabledNames = new Set(pluginState.listEnabled());
    return [...this._plugins.values()]
      .filter(e => enabledNames.has(e.meta.name))
      .map(e => ({ ...e.meta, capabilities: e.capabilities }));
  }

  // ----------------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------------

  /**
   * _buildContext
   * Constructs the ctx object passed to register/boot/shutdown.
   *
   * @param  {string} pluginName
   * @returns {object} ctx
   */
  _buildContext(pluginName) {
    // Seed config store with an empty config for this plugin
    pluginConfigStore.init(pluginName);

    return {
      services : serviceContainer,
      events   : eventBus,
      hooks    : hookRegistry,
      config   : {
        get    : (key)        => pluginConfigStore.get(pluginName, key),
        set    : (key, value) => pluginConfigStore.set(pluginName, key, value),
        getAll : ()           => pluginConfigStore.getAll(pluginName),
        setAll : (cfg)        => pluginConfigStore.setAll(pluginName, cfg),
      },
      app    : this.app,
      prisma : this.prisma,
      logger : this.logger,
    };
  }
}

module.exports = PluginManager;
