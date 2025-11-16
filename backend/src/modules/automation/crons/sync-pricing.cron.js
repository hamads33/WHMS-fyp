// src/modules/automation/cron/sync-pricing.cron.js

const cron = require("node-cron");
const domainService = require("../../domains/services/domain.service");

async function runSync() {
  try {
    console.log("⏳ [CRON] Starting Porkbun Pricing Sync...");

    const result = await domainService.syncPricingToDb();

    console.log(
      `✅ [CRON] Pricing Sync Complete. Updated TLDs: ${result.length}`
    );
  } catch (err) {
    console.error("❌ [CRON] Pricing Sync Error:", err.message);
  }
}

// Run immediately on startup
runSync();

// Schedule → daily at 02:00 AM
cron.schedule("0 2 * * *", () => {
  runSync();
  console.log("🔄 [CRON] Daily sync executed @ 2:00 AM");
});

module.exports = { runSync };
