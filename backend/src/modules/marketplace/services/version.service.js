const VersionStore = require("../stores/versionStore");

class VersionService {
    constructor(prisma) {
        this.store = new VersionStore(prisma);
    }

    create(data) {
        return this.store.create(data);
    }

    list(productId) {
        return this.store.list(productId);
    }
}

module.exports = VersionService;
