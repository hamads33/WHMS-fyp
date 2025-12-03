// modules/marketplace/services/sellerWebhook.service.js
const prisma  = require("../../../db/prisma");

module.exports = {
  /**
   * M8 - Create webhook endpoint for seller
   */
  async createWebhook(sellerId, { url, secret = null, enabled = true }) {
    if (!url) throw new Error("url required");

    return prisma.marketplaceWebhookEndpoint.create({
      data: {
        id: `wh-${Date.now()}`,
        vendorId: sellerId,
        url,
        secret,
        enabled,
      },
    });
  },

  /**
   * M9 - List all seller webhooks
   */
  async listForSeller(sellerId) {
    return prisma.marketplaceWebhookEndpoint.findMany({
      where: { vendorId: sellerId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Update webhook (internal use)
   */
  async updateWebhook(sellerId, id, data) {
    const wh = await prisma.marketplaceWebhookEndpoint.findUnique({ where: { id } });
    if (!wh || wh.vendorId !== sellerId) throw new Error("forbidden");

    return prisma.marketplaceWebhookEndpoint.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete webhook (internal use)
   */
  async deleteWebhook(sellerId, id) {
    const wh = await prisma.marketplaceWebhookEndpoint.findUnique({ where: { id } });
    if (!wh || wh.vendorId !== sellerId) throw new Error("forbidden");

    return prisma.marketplaceWebhookEndpoint.delete({
      where: { id },
    });
  },
};
