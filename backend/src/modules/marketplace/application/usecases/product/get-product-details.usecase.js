// get-product-details.usecase.js
class GetProductDetailsUseCase {
  constructor(productRepo, versionRepo, reviewRepo) {
    this.productRepo = productRepo;
    this.versionRepo = versionRepo;
    this.reviewRepo = reviewRepo;
  }

  /**
   * Accepts either:
   *   - string (slug)
   *   - { productId } or { slug }
   */
  async execute(arg) {
    let product;
    if (typeof arg === "string") {
      // assume slug
      product = await this.productRepo.findBySlug(arg);
    } else if (arg && arg.productId) {
      product = await this.productRepo.findById(arg.productId);
    } else if (arg && arg.slug) {
      product = await this.productRepo.findBySlug(arg.slug);
    } else {
      throw new Error("product identifier required");
    }

    if (!product) throw new Error("Product not found");

    const versions = await this.versionRepo.findForProduct(product.id);
    const reviews = await this.reviewRepo.listForProduct(product.id);

    return {
      product,
      versions,
      reviews,
    };
  }
}

module.exports = GetProductDetailsUseCase;
