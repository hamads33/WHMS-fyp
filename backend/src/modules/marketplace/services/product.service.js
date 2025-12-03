const ProductStore = require("../stores/productStore");
const slugify = require("../utils/slugify");

const ProductService = {
  // -----------------------------------------
  // CREATE DRAFT PRODUCT (UC-M6)
  // -----------------------------------------
  async createDraft(sellerId, payload) {
    return ProductStore.createDraft({
      sellerId,
      slug: slugify(payload.title),
      title: payload.title,
      shortDesc: payload.shortDesc,
      longDesc: payload.longDesc,
      tags: payload.tags || [],
      category: payload.category || null,
      status: "draft",
      logo: payload.logo || null,
    });
  },

  // -----------------------------------------
  // UPDATE DRAFT PRODUCT (UC-M6)
  // -----------------------------------------
  async updateDraft(productId, sellerId, data) {
    const product = await ProductStore.findById(productId);
    if (!product) throw new Error("Product not found");
    if (product.sellerId !== sellerId)
      throw new Error("Unauthorized");

    return ProductStore.update(productId, data);
  },

  // -----------------------------------------
  // SUBMIT FOR REVIEW (UC-M6 → UC-M8)
  // -----------------------------------------
  async submitForReview(productId, sellerId) {
    const product = await ProductStore.findById(productId);

    if (!product) throw new Error("Product not found");
    if (product.sellerId !== sellerId)
      throw new Error("Unauthorized");

    return ProductStore.setStatus(productId, "pending");
  },

  // -----------------------------------------
  // PUBLIC LIST (UC-M1)
  // -----------------------------------------
  async listPublic(query) {
    return ProductStore.listPublic({}, query);
  },

  // -----------------------------------------
  // SEARCH (UC-M1)
  // -----------------------------------------
  async searchPublic(q) {
    return ProductStore.searchPublic(q);
  },

  // -----------------------------------------
  // PRODUCT DETAILS PAGE (UC-M2)
  // -----------------------------------------
  async getBySlug(slug) {
    return ProductStore.findBySlug(slug);
  },

  // -----------------------------------------
  // VERSIONS (UC-M2)
  // -----------------------------------------
  async listVersions(productId) {
    return ProductStore.listVersions(productId);
  },
};

module.exports = ProductService;
