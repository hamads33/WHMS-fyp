const { prisma } = require('../../../db/prisma');
exports.search = async (req, res) => {
  try {
    const q = req.query.q || '';
    const rows = await prisma.marketplaceProduct.findMany({
      where: {
        status: 'approved',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { shortDesc: { contains: q, mode: 'insensitive' } },
        ]
      }
    });
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};
