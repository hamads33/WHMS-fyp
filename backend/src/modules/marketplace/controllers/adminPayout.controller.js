const { prisma } = require('../../../db/prisma');

exports.vendorEarnings = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    const earnings = await prisma.marketplacePurchase.aggregate({
      where: { product: { sellerId: vendorId }},
      _sum: { priceCents: true }
    });

    res.json({ ok: true, data: earnings._sum.priceCents || 0 });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

exports.listPayouts = async (req, res) => {
  try {
    const rows = await prisma.marketplacePayout.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const { vendorId, amount } = req.body;
    const payout = await prisma.marketplacePayout.create({
      data: {
        vendorId,
        amount,
        status: 'pending'
      }
    });
    res.json({ ok: true, data: payout });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

exports.markPaid = async (req, res) => {
  try {
    const payoutId = req.params.payoutId;

    const payout = await prisma.marketplacePayout.update({
      where: { id: payoutId },
      data: { status: 'paid' }
    });

    res.json({ ok: true, data: payout });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};
