const AggregationService = require('../services/analyticsAggregation.service');
const AnalyticsStore = require('../stores/analyticsStore');

module.exports = {
  // GET /marketplace/admin/analytics/top-plugins?limit=10
  async topPlugins(req, res) {
    try {
      const limit = Number(req.query.limit || 10);
      // crude aggregation via Prisma raw query for installs (opt.)
      const rows = await require('../../../db/prisma').$queryRaw`
        SELECT productId, COUNT(*) as installs
        FROM "MarketplaceAnalytics"
        WHERE "eventType" = 'plugin.install'
        GROUP BY productId
        ORDER BY installs DESC
        LIMIT ${limit}
      `;
      return res.json({ ok:true, data: rows });
    } catch (err) {
      return res.status(500).json({ ok:false, message: err.message });
    }
  },

  // GET /marketplace/admin/analytics/product/:productId/trends?days=30
  async productTrends(req, res) {
    try {
      const productId = req.params.productId;
      const days = Number(req.query.days || 30);
      const to = new Date();
      to.setUTCHours(0,0,0,0);
      const from = new Date(to.getTime() - (days*24*60*60*1000));
      const rows = await require('../../../db/prisma').marketplaceAnalyticsAggregate.findMany({
        where: { productId, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' }
      });
      return res.json({ ok:true, data: rows });
    } catch (err) {
      return res.status(500).json({ ok:false, message: err.message });
    }
  }
};
