// modules/marketplace/services/webhookDispatcher.service.js
const axios = require("axios");
const crypto = require("crypto");
const prisma  = require("../../../db/prisma");
const EndpointStore = require("../stores/webhookEndpointStore");

const WebhookDispatcher = {
  /**
   * Dispatch event to ALL vendor endpoints
   */
  async dispatchToVendor(vendorId, event, payload) {
    const endpoints = await EndpointStore.listByVendor(vendorId);
    const results = [];

    for (const ep of endpoints) {
      if (!ep.enabled) continue;

      const body = { event, payload, ts: Date.now() };
      const headers = { "Content-Type": "application/json" };

      // Prepare HMAC signature
      if (ep.secret) {
        headers["X-Marketplace-Signature"] = crypto
          .createHmac("sha256", ep.secret)
          .update(JSON.stringify(body))
          .digest("hex");
      }

      let success = false;
      let lastErr = null;
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts && !success; attempt++) {
        try {
          await axios.post(ep.url, body, { headers, timeout: 10_000 });
          success = true;
          results.push({ endpointId: ep.id, ok: true });
        } catch (err) {
          lastErr = err;
          await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
        }
      }

      // Log attempt
      await prisma.marketplaceAnalytics.create({
        data: {
          productId: null,
          versionId: null,
          eventType: "webhook.dispatch",
          meta: {
            vendorId,
            endpointId: ep.id,
            success,
            err: lastErr?.message?.substring(0, 200) || null,
          },
        },
      });
    }

    return results;
  },

  /**
   * Dispatch event to product seller
   */
  async dispatchToProductSeller(productId, event, payload) {
    const product = await prisma.marketplaceProduct.findUnique({
      where: { id: productId },
    });

    if (!product) return [];
    return this.dispatchToVendor(product.sellerId, event, payload);
  },
};

module.exports = WebhookDispatcher;
