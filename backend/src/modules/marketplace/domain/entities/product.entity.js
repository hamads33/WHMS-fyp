// src/modules/marketplace/domain/entities/product.entity.js
class MarketplaceProduct {
  constructor({ id, sellerId, title, slug, shortDesc, longDesc, categoryId, tags = [], status = 'draft', rejectReason = null, logo = null, screenshots = [], documentation = null, ratingAvg = 0, ratingCount = 0, installCount = 0, downloadCount = 0, createdAt = new Date(), updatedAt = new Date(), approvedAt = null }) {
    this.id = id;
    this.sellerId = sellerId;
    this.title = title;
    this.slug = slug;
    this.shortDesc = shortDesc;
    this.longDesc = longDesc;
    this.categoryId = categoryId;
    this.tags = tags;
    this.status = status;
    this.rejectReason = rejectReason;
    this.logo = logo;
    this.screenshots = screenshots;
    this.documentation = documentation;
    this.ratingAvg = ratingAvg;
    this.ratingCount = ratingCount;
    this.installCount = installCount;
    this.downloadCount = downloadCount;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.approvedAt = approvedAt;
  }

  updateMetadata({ title, shortDesc, longDesc, categoryId, tags, logo, screenshots, documentation }) {
    if (title !== undefined) this.title = title;
    if (shortDesc !== undefined) this.shortDesc = shortDesc;
    if (longDesc !== undefined) this.longDesc = longDesc;
    if (categoryId !== undefined) this.categoryId = categoryId;
    if (tags !== undefined) this.tags = tags;
    if (logo !== undefined) this.logo = logo;
    if (screenshots !== undefined) this.screenshots = screenshots;
    if (documentation !== undefined) this.documentation = documentation;
    this.updatedAt = new Date();
  }

  setStatus(status, reason = null) {
    this.status = status;
    this.rejectReason = reason;
    this.updatedAt = new Date();
    if (status === 'published') this.approvedAt = new Date();
  }

  recordInstall() {
    this.installCount += 1;
    this.updatedAt = new Date();
  }

  recordDownload() {
    this.downloadCount += 1;
    this.updatedAt = new Date();
  }

  addRating(rating) {
    const total = this.ratingAvg * this.ratingCount;
    this.ratingCount += 1;
    this.ratingAvg = (total + rating) / this.ratingCount;
    this.updatedAt = new Date();
  }
}

module.exports = MarketplaceProduct;
