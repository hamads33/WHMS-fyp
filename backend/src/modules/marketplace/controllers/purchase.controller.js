const PurchaseService = require("../services/purchase.service");

class PurchaseController {
    constructor({ prisma }) {
        this.service = new PurchaseService(prisma);
    }

    async buy(req, res) {
        try {
            const { userId, versionId } = req.body;
            const { productId } = req.params;

            const purchase = await this.service.buy(
                parseInt(userId),
                productId,
                versionId
            );

            res.json(purchase);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    listMine(req, res) {
        const { userId } = req.query;
        return this.service.listMine(parseInt(userId))
            .then(r => res.json(r));
    }
}

module.exports = PurchaseController;
