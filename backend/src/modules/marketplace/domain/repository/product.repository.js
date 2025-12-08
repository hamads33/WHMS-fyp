// src/modules/marketplace/domain/repository/product.repository.js
class ProductRepository {
  // Implement in infra layer (Prisma)
  async generateId() { throw new Error('Not implemented'); }
  async findById(id) { throw new Error('Not implemented'); }
  async findBySlug(slug) { throw new Error('Not implemented'); }
  async findPublicList(filter) { throw new Error('Not implemented'); }
  async save(product) { throw new Error('Not implemented'); } // create or update
  async delete(id) { throw new Error('Not implemented'); }
}

module.exports = ProductRepository;
