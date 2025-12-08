class AddReviewUseCase {
  constructor(reviewRepo, productRepo, idGen) {
    this.reviewRepo = reviewRepo;
    this.productRepo = productRepo;
    this.idGen = idGen;
  }

  async execute({ productId, userId, rating, stability, review }) {
    // VALIDATIONS
    if (!userId) throw new Error("User ID is required to submit a review");
    if (!productId) throw new Error("Product ID is required");

    const product = await this.productRepo.findById(productId);
    if (!product) throw new Error("Product not found");

    const id = this.idGen();

    // SAVE REVIEW
    await this.reviewRepo.save({
      id,
      productId,
      userId,
      rating,
      stability: stability ?? null,
      review,
      createdAt: new Date(),
    });

    // UPDATE PRODUCT RATING
    const newRatingCount = (product.ratingCount || 0) + 1;
    const newRatingAvg =
      ((product.ratingAvg || 0) * (newRatingCount - 1) + rating) /
      newRatingCount;

    product.ratingAvg = newRatingAvg;
    product.ratingCount = newRatingCount;

    await this.productRepo.save(product);

    return { id };
  }
}

module.exports = AddReviewUseCase;
