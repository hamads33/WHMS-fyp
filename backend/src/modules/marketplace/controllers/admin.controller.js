const ProductStore = require('../stores/productStore');
const SubmissionService = require('../services/submission.service');

module.exports = {

  async listProducts(req, res) {
    try {
      const rows = await ProductStore.listAdmin();
      res.json({ ok: true, data: rows });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  async approveProduct(req, res) {
    try {
      const productId = req.params.productId;
      const adminId = req.user.id;

      const result = await SubmissionService.approveProduct(productId, adminId);

      res.json({ ok: true, data: result });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  async rejectProduct(req, res) {
    try {
      const productId = req.params.productId;
      const adminId = req.user.id;
      const reason = req.body.reason || 'Not specified';

      const result = await SubmissionService.rejectProduct(productId, adminId, reason);

      res.json({ ok: true, data: result });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  }
};
