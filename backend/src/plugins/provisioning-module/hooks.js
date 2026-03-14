/**
 * provisioning-module/hooks.js
 * ------------------------------------------------------------------
 * Hook handlers for the provisioning plugin.
 */

/**
 * onServiceProvision
 * Triggered when the system wants to provision a new service.
 *
 * @param {object} payload
 * @param {string} payload.serviceId
 * @param {string} payload.username
 * @param {string} payload.domain
 * @param {string} payload.plan
 * @param {object} payload.provisioningService  - Injected by the caller
 */
async function onServiceProvision(payload) {
  const { serviceId, username, domain, plan, provisioningService } = payload;
  console.info(`[Provisioning] service.provision — Service #${serviceId}`);

  if (!provisioningService) {
    console.warn("[Provisioning] No provisioningService in payload — skipping");
    return;
  }

  await provisioningService.provision({ username, domain, plan });
}

/**
 * onServiceSuspend
 * Triggered when a service should be suspended (e.g. overdue invoice).
 *
 * @param {object} payload
 * @param {string} payload.serviceId
 * @param {string} payload.accountId
 */
async function onServiceSuspend({ serviceId, accountId }) {
  console.info(`[Provisioning] service.suspend — Service #${serviceId}`);
  // In a real plugin, look up provisioningService from the container
}

/**
 * onServiceTerminate
 * Triggered when a service is cancelled and should be deleted.
 *
 * @param {object} payload
 * @param {string} payload.serviceId
 * @param {string} payload.accountId
 */
async function onServiceTerminate({ serviceId, accountId }) {
  console.warn(`[Provisioning] service.terminate — Service #${serviceId}`);
}

/**
 * onCronHourly
 * Triggered every hour by the cron scheduler.
 * Use for usage polling, over-limit checks, etc.
 */
async function onCronHourly(payload) {
  console.info("[Provisioning] cron.hourly — Checking service usage");
}

module.exports = { onServiceProvision, onServiceSuspend, onServiceTerminate, onCronHourly };
