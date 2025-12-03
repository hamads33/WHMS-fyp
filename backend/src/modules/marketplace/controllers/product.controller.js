const ProductService = require('../services/product.service');

module.exports = {
  // ------------------------------------------------------
  // PUBLIC LIST (UC-M1)
  // ------------------------------------------------------
  async listPublic(req, res) {
    try {
      const query = {
        category: req.query.category,
        search: req.query.search,
        skip: Number(req.query.skip || 0),
        take: Number(req.query.take || 20),
      };

      const data = await ProductService.listPublic(query);
      return res.json({ ok: true, data });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // ------------------------------------------------------
  // PUBLIC SEARCH (UC-M1)
  // ------------------------------------------------------
  async searchPublic(req, res) {
    try {
      if (!req.query.q) {
        return res.status(400).json({
          ok: false,
          message: "Missing query ?q=",
        });
      }

      const data = await ProductService.searchPublic(req.query.q);
      return res.json({ ok: true, data });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // ------------------------------------------------------
  // PRODUCT DETAILS (UC-M2)
  // ------------------------------------------------------
  async getBySlug(req, res) {
    try {
      const slug = req.params.slug;
      const data = await ProductService.getBySlug(slug);

      if (!data) return res.status(404).json({ ok: false, message: "Not found" });

      return res.json({ ok: true, data });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // ------------------------------------------------------
  // SELLER: CREATE PRODUCT DRAFT
  // ------------------------------------------------------
  async createDraft(req, res) {
    try {
      const sellerId = req.user.marketplaceSeller.id;
      const payload = req.body;

      const data = await ProductService.createDraft(sellerId, payload);
      return res.json({ ok: true, data });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // ------------------------------------------------------
  // SELLER: UPDATE PRODUCT DRAFT
  // ------------------------------------------------------
  async updateDraft(req, res) {
    try {
      const sellerId = req.user.marketplaceSeller.id;
      const productId = req.params.productId;
      const data = req.body;

      const updated = await ProductService.updateDraft(productId, sellerId, data);
      return res.json({ ok: true, data: updated });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // ------------------------------------------------------
  // SELLER: SUBMIT FOR REVIEW
  // ------------------------------------------------------
  async submitForReview(req, res) {
    try {
      const sellerId = req.user.marketplaceSeller.id;
      const productId = req.params.productId;

      const data = await ProductService.submitForReview(productId, sellerId);
      return res.json({ ok: true, data });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },
};
