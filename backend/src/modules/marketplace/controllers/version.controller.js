const VersionService = require("../services/version.service");

class VersionController {
    constructor({ prisma }) {
        this.service = new VersionService(prisma);
    }

    async create(req, res) {
        try {
            const { productId } = req.params;
            const data = { ...req.body, productId };
            const version = await this.service.create(data);
            res.json(version);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async list(req, res) {
        const { productId } = req.params;
        res.json(await this.service.list(productId));
    }
}

module.exports = VersionController;
