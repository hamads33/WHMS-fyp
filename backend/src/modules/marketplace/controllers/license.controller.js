const LicenseService = require("../services/license.service");

module.exports = {
  async listMine(req, res) {
    try {
      const data = await LicenseService.listMine(req.user.id);
      res.json({ ok: true, data });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  async validate(req, res) {
    try {
      const { productId, licenseKey } = req.body;
      const result = await LicenseService.validateLicense(productId, licenseKey);
      res.json({ ok: true, data: result });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },
};
