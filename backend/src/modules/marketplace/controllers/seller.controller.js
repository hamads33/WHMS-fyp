const SellerService = require("../services/seller.service");

class SellerController {
    constructor({ prisma }) {
        this.service = new SellerService(prisma);
    }

    async register(req, res) {
        try {
            const { userId, storeName } = req.body;
            const seller = await this.service.register(userId, storeName);
            res.json(seller);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async me(req, res) {
        try {
            const userId = parseInt(req.query.userId);
            const seller = await this.service.getSeller(userId);
            res.json(seller);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

module.exports = SellerController;
