// src/modules/backup/provider/registry.js
const providerMap = new Map();

/**
 * registerBackupProvider({ id, label, schema, ProviderClass })
 * - id: string provider id (e.g. "s3", "sftp", "local")
 * - label: human label
 * - schema: JSON-like schema used by frontend to render forms
 * - ProviderClass: class implementing BaseProvider contract
 */
function registerBackupProvider({ id, label, schema = {}, ProviderClass }) {
  if (!id || !ProviderClass) throw new Error("Invalid provider registration");
  if (providerMap.has(id)) {
    console.warn(`provider '${id}' is already registered — overwriting`);
  }
  providerMap.set(id, { id, label, schema, ProviderClass });
}

/**
 * returns provider metadata object or undefined
 */
function getProviderInfo(id) {
  return providerMap.get(id);
}

/**
 * list providers as array
 */
function listProviders() {
  return Array.from(providerMap.values());
}

/**
 * instantiate provider with config (decrypted plain config)
 */
function createProviderInstance(id, config) {
  const entry = providerMap.get(id);
  if (!entry) throw new Error(`Provider not found: ${id}`);
  return new entry.ProviderClass(config);
}

/**
 * bootstrap: you can register built-in providers from here or from module bootstrap
 * Example: call registerBackupProvider for "local", "s3", "sftp" during module init.
 */

module.exports = {
  registerBackupProvider,
  getProviderInfo,
  listProviders,
  createProviderInstance
};
