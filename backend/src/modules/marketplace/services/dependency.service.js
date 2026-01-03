// Handle plugin licensing (FR-M05)

class LicensingService {
  constructor({ prisma, logger = console }) {
    this.prisma = prisma;
    this.logger = logger;
  }

  async checkLicense(productId, userId) {
    const product = await this.prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      select: { licenseType: true, licenseRequired: true }
    });

    if (!product) throw new Error("product_not_found");

    if (!product.licenseRequired || product.licenseType === "free") {
      return { canInstall: true, licenseType: "free" };
    }

    const purchase = await this.prisma.marketplacePurchase.findFirst({
      where: { productId, userId, status: "active" }
    });

    return {
      canInstall: !!purchase,
      licenseType: product.licenseType,
      licensedUntil: purchase?.expiresAt
    };
  }

  async getLicenseInfo(productId) {
    const product = await this.prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      select: { licenseType: true, licenseRequired: true }
    });

    if (!product) throw new Error("product_not_found");

    return {
      type: product.licenseType,
      required: product.licenseRequired
    };
  }
}

module.exports = LicensingService;
