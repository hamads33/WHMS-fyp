// src/modules/automation/automation.controller.js

const { runSync } = require("./crons/sync-pricing.cron");

exports.triggerPricingSync = async (req, res) => {
  try {
    await runSync();
    return res.json({
      success: true,
      message: "Manual pricing sync completed",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
