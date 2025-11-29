module.exports = class VersionStore {
    constructor(prisma) {
        this.prisma = prisma;
    }

    create(data) {
        return this.prisma.marketplaceVersion.create({ data });
    }

    list(productId) {
        return this.prisma.marketplaceVersion.findMany({
            where: { productId }
        });
    }
};
