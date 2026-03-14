/**
 * plugin-update.service.js
 * ------------------------------------------------------------------
 * Handles checking for and applying plugin updates.
 *
 * checkForUpdates(pluginName)
 *   - Looks up the installed version from PluginManager
 *   - Looks up the latest approved marketplace version
 *   - Compares using semver
 *   - Returns { upToDate, installedVersion, latestVersion, slug }
 *
 * updatePlugin(slug)
 *   - Delegates entirely to PluginInstallerService.installPlugin()
 *   - The installer already overwrites the plugin folder and hot-reloads
 */

const semver = require("semver");

class PluginUpdateService {
  /**
   * @param {object} opts
   * @param {object} opts.marketplaceService  - PluginMarketplaceService
   * @param {object} opts.installerService    - PluginInstallerService
   * @param {object} opts.pluginManager       - PluginManager instance
   * @param {object} [opts.logger]
   */
  constructor({ marketplaceService, installerService, pluginManager, logger = console } = {}) {
    this.marketplace   = marketplaceService;
    this.installer     = installerService;
    this.pluginManager = pluginManager;
    this.logger        = logger;
  }

  /**
   * checkForUpdates
   * Compares the installed plugin version against the latest approved
   * marketplace version using semver.
   *
   * @param  {string} pluginName  - Plugin name as registered in PluginManager
   * @returns {Promise<{
   *   upToDate        : boolean,
   *   slug            : string|null,
   *   installedVersion: string|null,
   *   latestVersion   : string|null,
   *   updateAvailable : boolean,
   *   message         : string,
   * }>}
   */
  async checkForUpdates(pluginName) {
    // ── Installed version from PluginManager ─────────────────────
    const pm = typeof this.pluginManager === "object"
      ? this.pluginManager
      : this.pluginManager?.();

    const installedList = pm?.list?.() ?? [];
    const installed     = installedList.find(p => p.name === pluginName);

    if (!installed) {
      return {
        upToDate        : false,
        slug            : null,
        installedVersion: null,
        latestVersion   : null,
        updateAvailable : false,
        message         : `Plugin "${pluginName}" is not installed`,
      };
    }

    // ── Latest approved version from marketplace ─────────────────
    let latestVersion;
    try {
      // getApprovedVersion looks up by slug — try name as slug first
      const slug = installed.slug ?? pluginName;
      latestVersion = await this.marketplace.getApprovedVersion(slug);
    } catch {
      return {
        upToDate        : true,
        slug            : installed.slug ?? pluginName,
        installedVersion: installed.version,
        latestVersion   : null,
        updateAvailable : false,
        message         : `No approved marketplace version found for "${pluginName}"`,
      };
    }

    const slug            = installed.slug ?? pluginName;
    const installedVer    = installed.version;
    const latestVer       = latestVersion.version;
    const updateAvailable = semver.valid(latestVer) && semver.valid(installedVer)
      ? semver.gt(latestVer, installedVer)
      : false;

    return {
      upToDate        : !updateAvailable,
      slug,
      installedVersion: installedVer,
      latestVersion   : latestVer,
      updateAvailable,
      message         : updateAvailable
        ? `Update available: ${installedVer} → ${latestVer}`
        : `Plugin "${pluginName}" is up to date (${installedVer})`,
    };
  }

  /**
   * updatePlugin
   * Overwrites the installed plugin folder with the latest approved version
   * and hot-reloads it. Reuses PluginInstallerService entirely.
   *
   * @param  {string} slug
   * @returns {Promise<object>}  install result from PluginInstallerService
   */
  async updatePlugin(slug) {
    this.logger.info(`[PluginUpdate] Starting update for: ${slug}`);
    const result = await this.installer.installPlugin(slug);
    this.logger.info(`[PluginUpdate] Updated "${slug}" to v${result.version}`);
    return { ...result, updated: true };
  }
}

module.exports = PluginUpdateService;
