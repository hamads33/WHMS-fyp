const PurchaseStore = require("../stores/purchaseStore");
const { v4: uuid } = require("uuid");

class PurchaseService {
    constructor(prisma) {
        this.store = new PurchaseStore(prisma);
    }

    async buy(userId, productId, versionId) {
        const licenseKey = uuid();

        return this.store.create({
            userId,
            productId,
            versionId,
            licenseKey,
        });
    }

    listMine(userId) {
        return this.store.listByUser(userId);
    }
}

module.exports = PurchaseService;
