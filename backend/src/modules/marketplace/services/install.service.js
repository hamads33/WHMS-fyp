// src/modules/marketplace/services/install.service.js
const LicenseService = require('./license.service');
const VersionStore = require('../stores/versionStore');
const PluginInstaller = require('./pluginInstaller.service');
const AnalyticsService = require('./analytics.service');
const ProductStore = require('../stores/productStore');

const InstallService = {
  /**
   * Install a plugin:
   * install(productId, userId, licenseKey, clientHost = null, userAgent = null, ip = null)
   */
  async install(productId, userId, licenseKey, clientHost = null, userAgent = null, ip = null) {
    // 1. Validate license (LicenseService should return { valid, license, reason })
    const { valid, license, reason } = await LicenseService.validateLicense(productId, licenseKey);

    if (!valid) {
      throw new Error("LICENSE_INVALID: " + reason);
    }

    // 2. Optional domain binding enforcement
    try {
      if (license && LicenseService.enforceDomainBinding) {
        LicenseService.enforceDomainBinding(license, clientHost);
      }
    } catch (err) {
      throw new Error("DOMAIN_BINDING_FAILED: " + String(err.message || err));
    }

    // 3. Enforce activation limits and create activation entry
    await LicenseService.activateLicense(license.id, userAgent, ip, clientHost);

    // 4. Retrieve latest approved version
    const latest = await VersionStore.findLatestApproved(productId);
    if (!latest) throw new Error("NO_APPROVED_VERSION_AVAILABLE");

    // 5. Perform installation from archive via plugin installer
    const installResult = await PluginInstaller.installFromArchive({
      archivePath: latest.archivePath,
      manifest: latest.manifestJson,
      productId,
      versionId: latest.id,
      uploadedBy: userId
    });

    // 6. Increment product install counters (best-effort)
    try {
      if (ProductStore && ProductStore.incrementInstall) {
        await ProductStore.incrementInstall(productId);
      }
    } catch (e) {
      // swallow
    }

    // 7. Analytics event (fire-and-forget)
    try {
      await AnalyticsService.track({
        eventType: "plugin.install",
        productId,
        versionId: latest.id,
        meta: { userId, clientHost, ip }
      });
    } catch (_) {}

    // 8. Return result
    return {
      ok: true,
      installedVersion: latest.version,
      installPath: installResult && installResult.installPath ? installResult.installPath : null
    };
  }
};

module.exports = InstallService;
