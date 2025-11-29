const ProductService = require("../services/product.service");

class ProductController {
    constructor({ prisma }) {
        this.service = new ProductService(prisma);
    }

    async create(req, res) {
        try {
            const product = await this.service.create(req.body);
            res.json(product);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async list(req, res) {
        res.json(await this.service.list());
    }

    async get(req, res) {
        const { slug } = req.params;
        const product = await this.service.get(slug);
        res.json(product);
    }

    async update(req, res) {
        const { productId } = req.params;
        const updated = await this.service.update(productId, req.body);
        res.json(updated);
    }

    async publish(req, res) {
        const { productId } = req.params;
        const published = await this.service.publish(productId);
        res.json(published);
    }
}

module.exports = ProductController;
