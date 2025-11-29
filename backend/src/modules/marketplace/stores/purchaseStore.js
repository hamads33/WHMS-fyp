module.exports = class PurchaseStore {
    constructor(prisma) {
        this.prisma = prisma;
    }

    create(data) {
        return this.prisma.marketplacePurchase.create({ data });
    }

    listByUser(userId) {
        return this.prisma.marketplacePurchase.findMany({
            where: { userId },
            include: {
                product: true,
                version: true
            }
        });
    }
};
