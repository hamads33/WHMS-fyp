const EndpointStore = require('../stores/webhookEndpointStore');

// controllers/webhookEndpoint.controller.js
const SellerWebhookService = require("../services/sellerWebhook.service");

exports.create = async (req, res) => {
  try {
    const sellerId = req.user.marketplaceSeller.id;
    const { url, secret } = req.body;
    if (!url) return res.status(400).json({ ok: false, message: 'url required' });

    const created = await EndpointStore.create({
      vendorId: sellerId,
      url,
      secret: secret || null,
      enabled: true
    });

    res.json({ ok: true, data: created });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const sellerId = req.user.marketplaceSeller.id;
    const rows = await EndpointStore.listByVendor(sellerId);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const sellerId = req.user.marketplaceSeller.id;
    const id = req.params.endpointId;
    const ep = await EndpointStore.findById(id);
    if (!ep || ep.vendorId !== sellerId) return res.status(404).json({ ok: false, message: 'Not found' });

    const updated = await EndpointStore.update(id, req.body);
    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};
exports.create = async (req, res) => {
  try {
    const sellerId = req.user.marketplaceSeller.id;
    const out = await SellerWebhookService.createWebhook(sellerId, req.body);
    res.json({ ok: true, data: out });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const sellerId = req.user.marketplaceSeller.id;
    const out = await SellerWebhookService.listForSeller(sellerId);
    res.json({ ok: true, data: out });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const sellerId = req.user.marketplaceSeller.id;
    const endpointId = req.params.endpointId;
    const out = await SellerWebhookService.updateWebhook(sellerId, endpointId, req.body);
    res.json({ ok: true, data: out });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const sellerId = req.user.marketplaceSeller.id;
    const endpointId = req.params.endpointId;
    const out = await SellerWebhookService.deleteWebhook(sellerId, endpointId);
    res.json({ ok: true, data: out });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
};
