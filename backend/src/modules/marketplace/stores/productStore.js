module.exports = class ProductStore {
    constructor(prisma) {
        this.prisma = prisma;
    }

    create(data) {
        return this.prisma.marketplaceProduct.create({ data });
    }

    list() {
        return this.prisma.marketplaceProduct.findMany({
            where: { status: "published" },
            include: { versions: true }
        });
    }

    getBySlug(slug) {
        return this.prisma.marketplaceProduct.findUnique({
            where: { slug },
            include: {
                seller: true,
                versions: true
            }
        });
    }

    update(id, data) {
        return this.prisma.marketplaceProduct.update({
            where: { id },
            data
        });
    }
};
