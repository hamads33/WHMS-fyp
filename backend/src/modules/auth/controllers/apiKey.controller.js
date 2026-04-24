const ApiKeyService = require("../services/apiKey.service");

const ApiKeyController = {
  async create(req, res) {
    try {
      const { name, scopes, expiresInDays } = req.body;
      const userId = req.user.id;

      const { rawKey, apiKey } = await ApiKeyService.createKey({
        userId,
        name,
        scopes,
        expiresInDays
      });

      return res.json({
        success: true,
        apiKeyId: apiKey.id,
        rawKey, // show to user ONCE
        scopes: apiKey.scopes
      });
    } catch (err) {
      console.error("API key create error:", err);
      res.status(400).json({ error: err.message });
    }
  },

  async list(req, res) {
    try {
      const keys = await ApiKeyService.listKeys(req.user.id);
      return res.json({ keys });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async revoke(req, res) {
    try {
      const { keyId } = req.params;
      await ApiKeyService.revokeKey({ userId: req.user.id, keyId });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = ApiKeyController;
