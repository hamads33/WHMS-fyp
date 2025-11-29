const ProductStore = require("../stores/productStore");

class ProductService {
    constructor(prisma) {
        this.store = new ProductStore(prisma);
    }

    create(data) {
        return this.store.create(data);
    }

    list() {
        return this.store.list();
    }

    get(slug) {
        return this.store.getBySlug(slug);
    }

    update(id, data) {
        return this.store.update(id, data);
    }

    publish(id) {
        return this.store.update(id, { status: "published" });
    }
}

module.exports = ProductService;
