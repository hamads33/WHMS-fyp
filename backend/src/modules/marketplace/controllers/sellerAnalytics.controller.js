const AnalyticsStore = require('../stores/analyticsStore');
const AggregationService = require('../services/analyticsAggregation.service');
const ProductStore = require('../stores/productStore');

module.exports = {
  // GET /marketplace/seller/analytics/overview?productId=
  async overview(req, res) {
    try {
      const seller = req.user.marketplaceSeller;
      const productId = req.query.productId;

      // simple permission: ensure product belongs to seller if productId provided
      if (productId) {
        const prod = await ProductStore.findById(productId);
        if (!prod || prod.sellerId !== seller.id) return res.status(403).json({ ok:false, message: 'forbidden' });
      }

      // time range
      const days = Number(req.query.days || 30);
      const to = new Date();
      const from = new Date(to.getTime() - (days*24*60*60*1000));

      // get aggregates
      const aggregates = productId ? await AnalyticsStore.listAggregates(productId, from, to) : [];

      // ad-hoc counts (today)
      const todayStart = new Date();
      todayStart.setUTCHours(0,0,0,0);
      const todayInstalls = productId ? await prisma.marketplaceAnalytics.count({ where: { productId, eventType: 'plugin.install', createdAt: { gte: todayStart }}}) : 0;

      return res.json({ ok:true, aggregates, todayInstalls });
    } catch (err) {
      return res.status(500).json({ ok:false, message: err.message });
    }
  },

  // GET /marketplace/seller/analytics/product/:productId/perf?metric=action_latency_ms
  async perf(req, res) {
    try {
      const seller = req.user.marketplaceSeller;
      const productId = req.params.productId;
      const prod = await ProductStore.findById(productId);
      if (!prod || prod.sellerId !== seller.id) return res.status(403).json({ ok:false, message: 'forbidden' });

      const metric = req.query.metric || 'action_latency_ms';
      const rows = await AnalyticsStore.listPerf(productId, metric, { skip:0, take: 200 });
      return res.json({ ok:true, data: rows });
    } catch (err) {
      return res.status(500).json({ ok:false, message: err.message });
    }
  },

  // GET /marketplace/seller/analytics/crashes/:productId
  async crashes(req, res) {
    try {
      const seller = req.user.marketplaceSeller;
      const productId = req.params.productId;
      const prod = await ProductStore.findById(productId);
      if (!prod || prod.sellerId !== seller.id) return res.status(403).json({ ok:false, message: 'forbidden' });

      const rows = await AnalyticsStore.listCrashes(productId, { skip:0, take: 200 });
      return res.json({ ok:true, data: rows });
    } catch (err) {
      return res.status(500).json({ ok:false, message: err.message });
    }
  }
};
