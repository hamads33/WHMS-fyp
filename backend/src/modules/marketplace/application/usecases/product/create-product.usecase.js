class CreateProductUseCase {
  constructor(productRepo, idGen) {
    this.productRepo = productRepo;
    this.idGen = idGen;
  }

  async execute(input) {
    const id = this.idGen();

    const product = {
      id,
      sellerId: input.sellerId,
      title: input.title,
      slug: input.slug,
      shortDesc: input.shortDesc,
      longDesc: input.longDesc,
      categoryId: input.categoryId,
      tags: input.tags || [],
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
      ratingAvg: 0,
      ratingCount: 0,
      installCount: 0,
      downloadCount: 0,
    };

    const saved = await this.productRepo.save(product);
    return saved;
  }
}

module.exports = CreateProductUseCase;
