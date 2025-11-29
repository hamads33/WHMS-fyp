module.exports = class SellerStore {
    constructor(prisma) {
        this.prisma = prisma;
    }

    createSeller(data) {
        return this.prisma.marketplaceSeller.create({ data });
    }

    getSellerByUserId(userId) {
        return this.prisma.marketplaceSeller.findUnique({
            where: { userId }
        });
    }
};
