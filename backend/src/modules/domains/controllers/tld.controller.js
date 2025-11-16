const tldService = require("../services/tld.service");

// ------------------------------------------------------
// GET ALL STORED TLDs
// ------------------------------------------------------
exports.getAllTlds = async (req, res) => {
  try {
    const tlds = await tldService.getAll();
    return res.json({ success: true, data: tlds });
  } catch (err) {
    console.error("TLD Get Error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to load TLDs",
    });
  }
};

// ------------------------------------------------------
// CREATE / UPDATE TLD (from UI)
// ------------------------------------------------------
exports.createOrUpdateTld = async (req, res) => {
  try {
    const { name, registerPrice, markupPercent } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "TLD name is required",
      });
    }

    const result = await tldService.createOrUpdate({
      name,
      registerPrice,
      markupPercent,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("Save TLD Error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to save TLD",
    });
  }
};

// ------------------------------------------------------
// SYNC TLDs FROM PORKBUN
// ------------------------------------------------------
exports.syncPricing = async (req, res) => {
  try {
    const count = await tldService.syncWithPorkbun();
    return res.json({
      success: true,
      message: `Synced ${count} TLDs successfully`,
    });
  } catch (err) {
    console.error("TLD Sync Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to sync TLD pricing",
    });
  }
};
