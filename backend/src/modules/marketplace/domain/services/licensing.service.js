// src/modules/marketplace/domain/services/licensing.service.js
const MarketplacePurchase = require('../entities/purchase.entity');
const { v4: uuidv4 } = require('uuid');

class LicensingDomainService {
  constructor({ purchaseRepository, licenseKeyGen, eventBus }) {
    this.purchaseRepository = purchaseRepository;
    this.licenseKeyGen = licenseKeyGen || (() => uuidv4());
    this.eventBus = eventBus;
  }

  async createPurchase({ userId, productId, versionId, activationLimit = 1, expiresAt = null }) {
    const id = uuidv4();
    const licenseKey = this.licenseKeyGen();
    const purchase = new MarketplacePurchase({ id, userId, productId, versionId, licenseKey, activationLimit, expiresAt });
    const created = await this.purchaseRepository.save(purchase);
    this.eventBus?.publish?.('marketplace.purchase.created', { purchase: created });
    return created;
  }

  async validateLicense(licenseKey) {
    const purchase = await this.purchaseRepository.findByLicenseKey(licenseKey);
    if (!purchase) return { valid: false };
    return { valid: purchase.isActive(), purchase };
  }
}

module.exports = LicensingDomainService;
