/**
 * Hosting Provider Contract
 * Path: src/modules/provisioning/providers/hosting.provider.js
 *
 * This abstraction keeps provider-specific logic outside WHMS core.
 */

/**
 * @typedef {Object} CreateSiteParams
 * @property {string} serverId
 * @property {string} domain
 * @property {string} email
 * @property {string} [phpVersion]
 * @property {string} [websiteId]
 * @property {string} [hostingAccountId]
 * @property {string} [userId]
 * @property {string} [packageName]
 */

/**
 * @typedef {Object} SiteResult
 * @property {boolean} success
 * @property {string} domain
 * @property {string} status
 * @property {string} command
 * @property {string} output
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} DeployAppParams
 * @property {string} serverId
 * @property {string} domain
 * @property {"node"|"laravel"|"static"} type
 * @property {string} [repositoryUrl]
 * @property {string} [branch]
 * @property {string} [deployPath]
 * @property {string} [releasePath]
 * @property {string} [archiveUrl]
 * @property {string} [sourcePath]
 * @property {string} [buildDirectory]
 * @property {string} [installCommand]
 * @property {string} [buildCommand]
 * @property {string} [startCommand]
 * @property {string} [processName]
 * @property {boolean} [runMigrations]
 * @property {boolean} [composerNoDev]
 * @property {Record<string, string|number|boolean>} [env]
 */

/**
 * @typedef {Object} DeploymentResult
 * @property {boolean} success
 * @property {string} type
 * @property {string} domain
 * @property {string} status
 * @property {string} command
 * @property {string} output
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} DatabaseParams
 * @property {string} serverId
 * @property {string} domain
 * @property {string} name
 * @property {string} user
 * @property {string} password
 * @property {string} [hostingAccountId]
 */

/**
 * @typedef {Object} DatabaseResult
 * @property {boolean} success
 * @property {string} name
 * @property {string} user
 * @property {string} status
 * @property {string} command
 * @property {string} output
 */

/**
 * @typedef {Object} SSLResult
 * @property {boolean} success
 * @property {string} domain
 * @property {string} status
 * @property {string} command
 * @property {string} output
 */

class HostingProvider {
  async createSite(_params) {
    throw new Error("createSite() must be implemented by provider");
  }

  async deleteSite(_domain) {
    throw new Error("deleteSite() must be implemented by provider");
  }

  async deployApp(_params) {
    throw new Error("deployApp() must be implemented by provider");
  }

  async installSSL(_domain) {
    throw new Error("installSSL() must be implemented by provider");
  }

  async createDatabase(_params) {
    throw new Error("createDatabase() must be implemented by provider");
  }

  async executeRaw(_serverId, _command) {
    throw new Error("executeRaw() must be implemented by provider");
  }
}

module.exports = HostingProvider;
