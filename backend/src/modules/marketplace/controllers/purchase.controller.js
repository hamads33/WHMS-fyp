const PurchaseService = require('../services/purchase.service');

exports.purchase = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null; // require auth in real
    if (!userId) return res.status(401).json({ ok: false, message: 'Auth required' });

    const productId = req.params.productId;
    const versionId = req.body.versionId;
    // Normally: create stripe checkout session -> on success create purchase entry in webhook
    const purchase = await PurchaseService.purchase(productId, userId, versionId, {});
    res.json({ ok: true, data: purchase });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};
