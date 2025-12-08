const PluginAPI = require("../../../../plugins/api");
class PurchasePluginUseCase {
  constructor(purchaseRepo, productRepo, idGen) {
    this.purchaseRepo = purchaseRepo;
    this.productRepo = productRepo;
    this.idGen = idGen;
  }

  async execute({ userId, productId, versionId }) {
    const product = await this.productRepo.findById(productId);
    if (!product) throw new Error("Product not found");

    const id = this.idGen();
    const licenseKey = "LIC-" + this.idGen().split("-")[0].toUpperCase();

    const purchase = {
      id,
      userId,
      productId,
      versionId,
      licenseKey,
      subscribed: false,
      activationLimit: 3,
      createdAt: new Date(),
    };

    return await this.purchaseRepo.save(purchase);
  }
}

module.exports = PurchasePluginUseCase;
