const InstallService = require('../services/install.service');

exports.install = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    const { licenseKey } = req.body;
    if (!licenseKey) return res.status(400).json({ ok: false, message: 'licenseKey required' });

    const out = await InstallService.install(productId, userId, licenseKey);
    res.json({ ok: true, data: out });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
};
