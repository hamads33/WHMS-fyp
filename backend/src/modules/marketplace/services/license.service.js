const prisma = require("../../../db/prisma");

const LicenseService = {
  /**
   * List all licenses owned by current user
   */
  async listMine(userId) {
    return prisma.marketplacePurchase.findMany({
      where: { userId, revoked: false },
      include: {
        product: true,
        version: true,
        activations: true,
      },
    });
  },

  /**
   * Validate license for installation or update
   */
  async validateLicense(productId, licenseKey) {
    const lic = await prisma.marketplacePurchase.findFirst({
      where: {
        productId,
        licenseKey,
        revoked: false,
      },
      include: {
        activations: true,
        product: true,
      },
    });

    if (!lic) {
      return { valid: false, reason: "INVALID_LICENSE" };
    }

    const now = new Date();
    if (lic.expiresAt && lic.expiresAt < now) {
      return { valid: false, reason: "LICENSE_EXPIRED" };
    }

    return { valid: true, license: lic };
  },

  /**
   * Check activation limits and record new activation
   */
  async activateLicense(licenseId, userAgent, ip, host = null) {
    const lic = await prisma.marketplacePurchase.findUnique({
      where: { id: licenseId },
      include: { activations: true },
    });

    if (!lic) throw new Error("License not found");

    // ENFORCE ACTIVATION LIMIT
    if (lic.activations.length >= lic.activationLimit) {
      throw new Error("ACTIVATION_LIMIT_REACHED");
    }

    return prisma.marketplaceLicenseActivation.create({
      data: {
        licenseId,
        userAgent,
        ip,
        host,
      },
    });
  },

  /**
   * Optional binding: domain/IP lock
   */
  enforceDomainBinding(license, host) {
    if (!license.product) return true;

    const requiredLock = license.product.metadata?.lockToDomain;

    if (!requiredLock) return true;

    if (!host) throw new Error("DOMAIN_REQUIRED");

    const allowedDomain = license.metadata?.boundDomain;
    if (!allowedDomain)
      throw new Error("LICENSE_NOT_BOUND");

    if (allowedDomain !== host)
      throw new Error("DOMAIN_MISMATCH");

    return true;
  },

  /**
   * Revoke license permanently
   */
  async revoke(licenseId) {
    return prisma.marketplacePurchase.update({
      where: { id: licenseId },
      data: { revoked: true },
    });
  },
};

module.exports = LicenseService;
