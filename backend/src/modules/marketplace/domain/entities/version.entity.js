// src/modules/marketplace/domain/entities/version.entity.js
class MarketplaceVersion {
  constructor({ id, productId, version, manifestJson, archivePath, changelog = null, priceCents = 0, currency = 'USD', createdAt = new Date() }) {
    this.id = id;
    this.productId = productId;
    this.version = version;
    this.manifestJson = manifestJson;
    this.archivePath = archivePath;
    this.changelog = changelog;
    this.priceCents = priceCents;
    this.currency = currency;
    this.createdAt = createdAt;
  }
}

module.exports = MarketplaceVersion;
