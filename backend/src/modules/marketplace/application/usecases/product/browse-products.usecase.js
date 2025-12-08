class BrowseProductsUseCase {
  constructor(productRepo) {
    this.productRepo = productRepo;
  }

  async execute(query = {}) {
    const { search, categoryId, sort } = query;

    return await this.productRepo.findMany({
      search,
      categoryId,
      sort,
    });
  }
}

module.exports = BrowseProductsUseCase;
