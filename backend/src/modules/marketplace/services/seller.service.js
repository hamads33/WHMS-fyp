// modules/marketplace/services/seller.service.js
const SellerStore = require("../stores/sellerStore");

module.exports = {
  async getMySeller(userId) {
    return SellerStore.findByUserId(userId);
  },

  async applySeller(userId, data = {}) {
    const existing = await SellerStore.findByUserId(userId);
    if (existing) return existing;
    const createData = {
      userId,
      storeName: data.storeName || `store-${userId}`,
      stripeAccountId: data.stripeAccountId || null,
    };
    return SellerStore.create(createData);
  },

  async updateSeller(id, data) {
    return SellerStore.update(id, data);
  },
};
