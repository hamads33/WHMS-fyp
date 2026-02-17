/**
 * Invoice Settings Controller
 * Path: src/modules/billing/controllers/invoice-settings.controller.js
 */

const invoiceSettingsService = require("../services/invoice-settings.service");

exports.get = async (req, res) => {
  try {
    const settings = await invoiceSettingsService.get();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const settings = await invoiceSettingsService.update(req.body);
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
