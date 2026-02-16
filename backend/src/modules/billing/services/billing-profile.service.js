/**
 * Billing Profile Service
 * Path: src/modules/billing/services/billing-profile.service.js
 * FR-11: Client billing profile management
 * FR-12: Currency handling
 */

const prisma = require("../../../../prisma");

class BillingProfileService {
  /**
   * Get or create billing profile for a client
   */
  async getOrCreate(clientId) {
    let profile = await prisma.billingProfile.findUnique({
      where: { clientId },
    });

    if (!profile) {
      profile = await prisma.billingProfile.create({
        data: { clientId },
      });
    }

    return profile;
  }

  /**
   * Get profile by clientId
   */
  async getByClientId(clientId) {
    const profile = await prisma.billingProfile.findUnique({
      where: { clientId },
    });

    if (!profile) {
      const err = new Error("Billing profile not found");
      err.statusCode = 404;
      throw err;
    }

    return profile;
  }

  /**
   * Create billing profile
   */
  async create(clientId, data) {
    const existing = await prisma.billingProfile.findUnique({
      where: { clientId },
    });

    if (existing) {
      const err = new Error("Billing profile already exists for this client");
      err.statusCode = 409;
      throw err;
    }

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: clientId } });
    if (!user) {
      const err = new Error("Client not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.billingProfile.create({
      data: {
        clientId,
        currency: data.currency || "USD",
        billingAddress: data.billingAddress || null,
        city: data.city || null,
        country: data.country || null,
        postalCode: data.postalCode || null,
        taxId: data.taxId || null,
        paymentMethodRef: data.paymentMethodRef || null,
      },
    });
  }

  /**
   * Update billing profile
   */
  async update(clientId, data) {
    const profile = await this.getByClientId(clientId);

    const updateData = {};
    const allowed = [
      "currency",
      "billingAddress",
      "city",
      "country",
      "postalCode",
      "taxId",
      "paymentMethodRef",
    ];

    for (const field of allowed) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return prisma.billingProfile.update({
      where: { clientId },
      data: updateData,
    });
  }

  /**
   * Admin: list all profiles
   */
  async listAll(options = {}) {
    const { limit = 100, offset = 0 } = options;
    return prisma.billingProfile.findMany({
      include: { client: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }
}

module.exports = new BillingProfileService();