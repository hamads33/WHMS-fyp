const SellerStore = require("../stores/sellerStore");

class SellerService {
    constructor(prisma) {
        this.store = new SellerStore(prisma);
    }

    async register(userId, storeName) {
        const existing = await this.store.getSellerByUserId(userId);
        if (existing) throw new Error("Seller already registered");

        return this.store.createSeller({
            userId,
            storeName
        });
    }

    async getSeller(userId) {
        return this.store.getSellerByUserId(userId);
    }
}

module.exports = SellerService;
