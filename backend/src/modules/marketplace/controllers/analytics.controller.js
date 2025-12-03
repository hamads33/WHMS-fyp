// const { prisma } = require('../../../db/prisma');

// exports.track = async (req, res) => {
//   try {
//     const { productId, versionId, eventType, meta } = req.body;
//     const row = await prisma.marketplaceAnalytics.create({ data: { productId, versionId, eventType, meta }});
//     res.json({ ok: true, data: row });
//   } catch (err) {
//     res.status(500).json({ ok: false, message: err.message });
//   }
// };
const AnalyticsService = require('../services/analytics.service');

module.exports = {
  // POST /marketplace/analytics/event
  async track(req, res) {
    try {
      const payload = req.body;
      if (!payload || !payload.productId || !payload.eventType) {
        return res.status(400).json({ ok:false, message: 'productId and eventType required' });
      }
      await AnalyticsService.track(payload);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok:false, message: err.message });
    }
  }
};
