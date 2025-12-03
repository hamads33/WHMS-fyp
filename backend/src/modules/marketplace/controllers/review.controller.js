const { prisma } = require('../../../db/prisma');
exports.add = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    const { rating, review, stability } = req.body;
    const r = await prisma.marketplaceReview.create({
      data: { userId, productId, rating: Number(rating), review, stability: stability ? Number(stability) : null }
    });

    // recalc avg
    const agg = await prisma.marketplaceReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    await prisma.marketplaceProduct.update({ where: { id: productId }, data: { ratingAvg: agg._avg.rating || 0, ratingCount: agg._count.rating || 0 }});
    res.json({ ok: true, data: r });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const productId = req.params.productId;
    const rows = await require('../stores/reviewStore').listByProduct(productId);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};
