// src/modules/marketplace/controllers/version.controller.js
const VersionService = require('../services/version.service');
const InstallService = require('../services/install.service');

module.exports = {
  // GET /marketplace/products/:productId/versions
  async list(req, res) {
    try {
      const productId = req.params.productId;
      const versions = await VersionService.listVersions(productId);
      return res.json({ ok: true, data: versions });
    } catch (err) {
      console.error("VersionController.list error:", err);
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // POST /marketplace/seller/products/:productId/version
  async upload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, message: "ZIP file is required" });
      }

      const seller = req.user && req.user.marketplaceSeller;
      if (!seller) {
        return res.status(403).json({ ok: false, message: "Missing seller credentials" });
      }
      const sellerId = seller.id;
      const productId = req.params.productId;

      const { version, changelog, priceCents, currency } = req.body;
      const manifestJson = req.body.manifest ? JSON.parse(req.body.manifest) : {};

      const created = await VersionService.uploadVersion(
        productId,
        sellerId,
        {
          version,
          changelog,
          archivePath: req.file.path,
          manifestJson,
          priceCents: Number(priceCents || 0),
          currency: currency || "USD",
          signature: req.body.signature,
          publicKeyPem: req.body.publicKeyPem
        }
      );

      return res.json({ ok: true, data: created });
    } catch (err) {
      console.error("VersionController.upload error:", err);
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // GET /marketplace/updates/check
  async checkUpdates(req, res) {
    try {
      const { productId, installedVersion } = req.query;
      const result = await VersionService.checkUpdatesForUser(productId, installedVersion);
      return res.json({ ok: true, data: result });
    } catch (err) {
      console.error("VersionController.checkUpdates error:", err);
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // POST /marketplace/updates/install/:productId
  async installUpdate(req, res) {
    try {
      const productId = req.params.productId;
      const { licenseKey } = req.body;
      const userId = req.user && req.user.id;

      const result = await InstallService.install(productId, userId, licenseKey, req.body.clientHost || null, req.headers['user-agent'] || null, req.ip || null);

      return res.json({ ok: true, data: result });
    } catch (err) {
      console.error("VersionController.installUpdate error:", err);
      return res.status(500).json({ ok: false, message: err.message });
    }
  }
};
