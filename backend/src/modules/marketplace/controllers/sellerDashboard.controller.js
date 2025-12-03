const prisma = require("../../../db/prisma");
const SellerStore = require("../stores/sellerStore");

const sellerDashboardCtrl = {
  /**
   * UC-M6: Seller Overview
   * - total products
   * - total sales
   * - total installs
   * - total ratings
   * - pending submissions
   */
  async getOverview(req, res) {
    try {
      const seller = await SellerStore.findByUserId(req.user.id);
      if (!seller) return res.status(404).json({ error: "Seller profile not found" });

      const sellerId = seller.id;

      const [productCount, salesCount, installSum, avgRating, pendingSubmissions] =
        await Promise.all([
          prisma.marketplaceProduct.count({ where: { sellerId } }),
          prisma.marketplacePurchase.count({
            where: { product: { sellerId } },
          }),
          prisma.marketplaceProduct.aggregate({
            where: { sellerId },
            _sum: { installCount: true },
          }),
          prisma.marketplaceProduct.aggregate({
            where: { sellerId },
            _avg: { ratingAvg: true },
          }),
          prisma.marketplaceSubmission.count({
            where: {
              product: { sellerId },
              status: "pending",
            },
          }),
        ]);

      res.json({
        products: productCount,
        totalSales: salesCount,
        totalInstalls: installSum._sum.installCount || 0,
        avgRating: avgRating._avg.ratingAvg || 0,
        pendingSubmissions,
      });
    } catch (err) {
      console.error("Dashboard overview error:", err);
      res.status(500).json({ error: "Failed to load dashboard overview" });
    }
  },

  /**
   * UC-M6: Seller Product Stats
   * - Basic info
   * - Ratings
   * - Installs
   * - Downloads
   */
  async getProductsStats(req, res) {
    try {
      const seller = await SellerStore.findByUserId(req.user.id);
      if (!seller) return res.status(404).json({ error: "Seller profile not found" });

      const products = await prisma.marketplaceProduct.findMany({
        where: { sellerId: seller.id },
        select: {
          id: true,
          title: true,
          slug: true,
          ratingAvg: true,
          ratingCount: true,
          installCount: true,
          downloadCount: true,
          status: true,
          updatedAt: true,
        },
      });

      res.json(products);
    } catch (err) {
      console.error("Products stats error:", err);
      res.status(500).json({ error: "Failed to load product stats" });
    }
  },

  /**
   * UC-M6: Seller Submissions
   * Show:
   * - version submissions
   * - status (approved, rejected, pending)
   * - reviewer
   * - notes
   */
  async getSubmissions(req, res) {
    try {
      const seller = await SellerStore.findByUserId(req.user.id);
      if (!seller) return res.status(404).json({ error: "Seller profile not found" });

      const submissions = await prisma.marketplaceSubmission.findMany({
        where: { product: { sellerId: seller.id } },
        orderBy: { createdAt: "desc" },
        include: {
          version: true,
          product: { select: { title: true } },
          reviewer: { select: { id: true, email: true } },
        },
      });

      res.json(submissions);
    } catch (err) {
      console.error("Submissions error:", err);
      res.status(500).json({ error: "Failed to load submissions" });
    }
  },

  /**
   * UC-M6: Seller Request Payout (Stub)
   * You can later plug Stripe, PayPal or internal payout system.
   */
  async requestPayout(req, res) {
    try {
      const seller = await SellerStore.findByUserId(req.user.id);
      if (!seller) return res.status(404).json({ error: "Seller profile not found" });

      // Stub response — you can connect Stripe later
      res.json({
        ok: true,
        message: "Payout request received (stub). Implement Stripe/Bank later.",
      });
    } catch (err) {
      console.error("Payout request error:", err);
      res.status(500).json({ error: "Failed to request payout" });
    }
  },
};

module.exports = sellerDashboardCtrl;
