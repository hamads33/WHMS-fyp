const PurchaseStore = require('../stores/purchaseStore');
const VersionStore = require('../stores/versionStore');
const ProductStore = require('../stores/productStore');
const LicenseToken = require('../utils/licenseToken');
const webhook = require('../utils/webhookEmitter');

const PurchaseService = {
  async purchase(productId, userId, versionId, { priceCents }) {
    // Generate License
    const licenseKey = LicenseToken.generate({ productId, userId, versionId });

    // Create purchase record
    const purchase = await PurchaseStore.create({
      productId,
      userId,
      versionId,
      licenseKey,
      subscribed: false,
      activationLimit: 1,
      expiresAt: null,
      revoked: false
    });

    // Increase install counter
    await ProductStore.incrementInstallCount(productId);

    // 🔥 Webhook emit
    await webhook.emit('marketplace.purchase.completed', {
      purchaseId: purchase.id,
      userId,
      productId,
      versionId,
      licenseKey,
      timestamp: Date.now()
    });

    return purchase;
  },

  async listUserLicenses(userId) {
    return PurchaseStore.listByUser(userId);
  },

  async validateLicense(productId, licenseKey) {
    const purchase = await PurchaseStore.findByLicense(licenseKey);
    if (!purchase) return null;
    if (purchase.productId !== productId) return null;
    if (purchase.revoked) return null;
    return purchase;
  }
};

module.exports = PurchaseService;
