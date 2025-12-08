// update-product-info.usecase.js
class UpdateProductInfoUseCase {
  constructor(productRepo) {
    this.productRepo = productRepo;
  }

  // accept { productId, payload } to match controller shape
  async execute({ productId, payload }) {
    if (!productId) throw new Error("productId required");
    const product = await this.productRepo.findById(productId);
    if (!product) throw new Error("Product not found");

    const merged = Object.assign({}, product, payload, { updatedAt: new Date() });
    return await this.productRepo.save(merged);
  }
}

module.exports = UpdateProductInfoUseCase;
