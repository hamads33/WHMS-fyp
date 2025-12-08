// src/modules/marketplace/domain/services/product.service.js
const MarketplaceProduct = require('../entities/product.entity');

class ProductDomainService {
  constructor({ productRepository, eventBus }) {
    this.productRepository = productRepository; // repo implements persistence
    this.eventBus = eventBus; // eventBus.publish(name, payload)
  }

  async createProduct({ sellerId, dto }) {
    // dto: { title, slug, shortDesc, longDesc, categoryId, tags }
    const id = await this.productRepository.generateId();
    const product = new MarketplaceProduct({ id, sellerId, ...dto });
    const created = await this.productRepository.save(product);
    this.eventBus?.publish?.('marketplace.product.created', { product: created });
    return created;
  }

  async updateProduct(productId, updates) {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new Error('Product not found');
    product.updateMetadata(updates);
    const saved = await this.productRepository.save(product);
    return saved;
  }

  async publish(productId, actorId) {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new Error('Product not found');
    product.setStatus('published');
    const saved = await this.productRepository.save(product);
    this.eventBus?.publish?.('marketplace.product.published', { productId: saved.id, actorId });
    return saved;
  }

  async addRating(productId, rating) {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new Error('Product not found');
    product.addRating(rating);
    return this.productRepository.save(product);
  }

  async recordInstall(productId) {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new Error('Product not found');
    product.recordInstall();
    return this.productRepository.save(product);
  }
}

module.exports = ProductDomainService;
