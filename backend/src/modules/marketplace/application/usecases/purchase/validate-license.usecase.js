class ValidateLicenseUseCase {
  constructor(purchaseRepo) {
    this.purchaseRepo = purchaseRepo;
  }

  async execute(licenseKey) {
    const purchase = await this.purchaseRepo.findByLicenseKey(licenseKey);
    if (!purchase) return { valid: false };

    if (purchase.revoked) return { valid: false };
    if (purchase.expiresAt && purchase.expiresAt < new Date())
      return { valid: false };

    return { valid: true, purchase };
  }
}

module.exports = ValidateLicenseUseCase;
