// src/modules/marketplace/controllers/seller.controller.js
const prisma = require("../../../db/prisma");
const SellerStore = require("../stores/sellerStore");

const sellerCtrl = {
  /**
   * APPLY TO BECOME A SELLER
   * POST /seller/apply
   */
  async apply(req, res) {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

      // Check if user already has a seller profile
      const existing = await SellerStore.findByUserId(userId);
      if (existing) {
        return res.json({
          ok: true,
          message: "You already have a seller account.",
          seller: existing,
        });
      }

      const seller = await SellerStore.create({
        userId,
        storeName: req.body.storeName || req.user.displayName || "My Store",
        stripeAccountId: null
      });

      res.json({
        ok: true,
        message: "Seller account created successfully.",
        seller,
      });
    } catch (err) {
      console.error("Seller.apply error:", err);
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  /**
   * GET SELLER PROFILE
   * GET /seller/me
   */
  async me(req, res) {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

      const seller = await SellerStore.findByUserId(userId);
      if (!seller) {
        return res.status(404).json({ ok: false, message: "You are not a seller yet." });
      }

      res.json({ ok: true, seller });
    } catch (err) {
      console.error("Seller.me error:", err);
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  /**
   * CREATE DRAFT PRODUCT
   * POST /seller/products
   */
  async createDraft(req, res) {
    try {
      const seller = await SellerStore.findByUserId(req.user.id);
      if (!seller) return res.status(403).json({ ok: false, message: "Not a seller" });

      const product = await prisma.marketplaceProduct.create({
        data: {
          sellerId: seller.id,
          title: req.body.title || "Untitled Product",
          slug: req.body.slug || null,
          shortDesc: req.body.shortDesc || "",
          longDesc: req.body.longDesc || "",
          categoryId: req.body.categoryId || null,
          tags: req.body.tags || [],
          status: "draft",
        }
      });

      res.json({ ok: true, product });
    } catch (err) {
      console.error("Seller.createDraft error:", err);
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  /**
   * UPDATE PRODUCT DRAFT
   * PUT /seller/products/:productId
   */
  async updateDraft(req, res) {
    try {
      const seller = await SellerStore.findByUserId(req.user.id);
      if (!seller) return res.status(403).json({ ok: false, message: "Not a seller" });

      const productId = req.params.productId;
      const product = await prisma.marketplaceProduct.findUnique({ where: { id: productId } });

      if (!product || product.sellerId !== seller.id) {
        return res.status(404).json({ ok: false, message: "Product not found or not yours" });
      }

      if (product.status !== "draft") {
        return res.status(400).json({ ok: false, message: "Only draft products can be edited" });
      }

      const updated = await prisma.marketplaceProduct.update({
        where: { id: productId },
        data: {
          title: req.body.title,
          slug: req.body.slug,
          shortDesc: req.body.shortDesc,
          longDesc: req.body.longDesc,
          categoryId: req.body.categoryId,
          tags: req.body.tags
        }
      });

      res.json({ ok: true, product: updated });
    } catch (err) {
      console.error("Seller.updateDraft error:", err);
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  /**
   * SUBMIT PRODUCT FOR REVIEW
   * POST /seller/products/:productId/submit
   */
  async submitForReview(req, res) {
    try {
      const seller = await SellerStore.findByUserId(req.user.id);
      if (!seller) return res.status(403).json({ ok: false, message: "Not a seller" });

      const productId = req.params.productId;
      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: productId },
        include: { versions: true }
      });

      if (!product || product.sellerId !== seller.id) {
        return res.status(404).json({ ok: false, message: "Product not found or not yours" });
      }

      if (product.status !== "draft") {
        return res.status(400).json({ ok: false, message: "Only draft products can be submitted" });
      }

      if (!product.versions || product.versions.length === 0) {
        return res.status(400).json({ ok: false, message: "Upload at least one version before submitting" });
      }

      // Mark product as pending
      await prisma.marketplaceProduct.update({
        where: { id: productId },
        data: { status: "pending" }
      });

      // Create submission record
      const submission = await prisma.marketplaceSubmission.create({
        data: {
          productId,
          versionId: product.versions[0].id,
          status: "pending",
          reviewerId: null,
          notes: null
        }
      });

      res.json({ ok: true, message: "Product submitted for review.", submission });
    } catch (err) {
      console.error("Seller.submitForReview error:", err);
      res.status(500).json({ ok: false, message: err.message });
    }
  }
};

module.exports = sellerCtrl;
