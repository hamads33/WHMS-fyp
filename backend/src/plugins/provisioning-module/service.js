/**
 * provisioning-module/service.js
 * ------------------------------------------------------------------
 * Example server provisioning service.
 *
 * In a real plugin this would integrate with a control panel API
 * (cPanel, Plesk, DirectAdmin, custom REST API, etc.).
 *
 * The service contract expected by the core provisioning module:
 *   provision(params)   → create account / spin up resource
 *   suspend(params)     → suspend account
 *   unsuspend(params)   → restore account
 *   terminate(params)   → delete account
 *   getUsage(params)    → return resource usage stats
 */

class ProvisioningService {
  /**
   * @param {object} opts
   * @param {string} opts.serverHost  - Control panel hostname
   * @param {string} opts.apiKey      - API key or password
   * @param {object} opts.logger
   */
  constructor({ serverHost, apiKey, logger = console } = {}) {
    this.serverHost = serverHost;
    this.apiKey     = apiKey;
    this.logger     = logger;
    this.name       = "example-provisioning-module";
  }

  /**
   * provision
   * Create a new hosting account or service instance.
   *
   * @param  {object} params
   * @param  {string} params.username
   * @param  {string} params.domain
   * @param  {string} params.plan
   * @returns {Promise<{ success: boolean, accountId: string }>}
   */
  async provision({ username, domain, plan }) {
    this.logger.info(
      `[Provisioning] Creating account: user=${username} domain=${domain} plan=${plan}`
    );

    // --- Replace with real control panel API call ---
    const accountId = `acc_${Date.now()}_${username}`;
    // ------------------------------------------------

    return { success: true, accountId };
  }

  /**
   * suspend
   * Suspend an existing account.
   *
   * @param  {object} params
   * @param  {string} params.accountId
   * @param  {string} [params.reason]
   * @returns {Promise<{ success: boolean }>}
   */
  async suspend({ accountId, reason = "non-payment" }) {
    this.logger.info(`[Provisioning] Suspending account ${accountId}: ${reason}`);
    // --- Replace with real API call ---
    return { success: true };
  }

  /**
   * unsuspend
   * Re-activate a suspended account.
   *
   * @param  {object} params
   * @param  {string} params.accountId
   * @returns {Promise<{ success: boolean }>}
   */
  async unsuspend({ accountId }) {
    this.logger.info(`[Provisioning] Unsuspending account ${accountId}`);
    return { success: true };
  }

  /**
   * terminate
   * Permanently delete an account and its data.
   *
   * @param  {object} params
   * @param  {string} params.accountId
   * @returns {Promise<{ success: boolean }>}
   */
  async terminate({ accountId }) {
    this.logger.warn(`[Provisioning] Terminating account ${accountId}`);
    return { success: true };
  }

  /**
   * getUsage
   * Return current resource usage for an account.
   *
   * @param  {object} params
   * @param  {string} params.accountId
   * @returns {Promise<{ diskUsedMb: number, bandwidthUsedGb: number }>}
   */
  async getUsage({ accountId }) {
    this.logger.info(`[Provisioning] Fetching usage for account ${accountId}`);
    // Return stub data — replace with real API call
    return { diskUsedMb: 0, bandwidthUsedGb: 0 };
  }
}

module.exports = ProvisioningService;
