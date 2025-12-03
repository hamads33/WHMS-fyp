const prisma  = require('../../../db/prisma');
const WebhookDispatcher = require('../services/webhookDispatcher.service');

module.exports = {
  async emit(event, payload) {
    // store event in DB
    await prisma.marketplaceWebhook.create({
      data: {
        event,
        payload
      }
    });

    // For product-scoped events, attempt to deliver to seller endpoints
    try {
      if (payload && payload.productId) {
        await WebhookDispatcher.dispatchToProductSeller(payload.productId, event, payload);
      } else if (payload && payload.vendorId) {
        await WebhookDispatcher.dispatchToVendor(payload.vendorId, event, payload);
      }
    } catch (err) {
      // swallow; analytics record already created in dispatcher
      console.error('Webhook dispatch error', err.message);
    }
  }
};
