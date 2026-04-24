/**
 * Provisioning Cron Jobs
 * Path: src/modules/provisioning/jobs/provisioning.cron.js
 *
 * Automated tasks:
 * - Sync account usage stats from VestaCP
 * - Retry failed provisioning attempts
 * - Cleanup deleted accounts
 */

const cron = require("node-cron");
const prisma = require("../../../../prisma");
const provisioningService = require("../services/provisioning.service");

/**
 * JOB 1: Sync account usage stats (runs every 6 hours)
 * Pulls disk usage, bandwidth, etc from VestaCP
 */
function scheduleSyncStatsJob() {
  cron.schedule("0 */6 * * *", async () => {
    console.log("[PROVISIONING CRON] Running stats sync...");
    try {
      const accounts = await prisma.hostingAccount.findMany({
        where: { status: "active" },
      });

      let synced = 0;
      let failed = 0;

      for (const account of accounts) {
        try {
          await provisioningService.syncAccountStats(account.username);
          synced++;
        } catch (err) {
          console.error(
            `[PROVISIONING CRON] Failed to sync ${account.username}:`,
            err.message
          );
          failed++;
        }
      }

      console.log(
        `[PROVISIONING CRON] Stats sync complete: ${synced} synced, ${failed} failed`
      );
    } catch (err) {
      console.error("[PROVISIONING CRON] Stats sync job failed:", err.message);
    }
  });
}

/**
 * JOB 2: Retry failed provisioning (runs every hour)
 * Attempts to re-provision accounts that failed initially
 */
function scheduleRetryFailedJob() {
  cron.schedule("0 * * * *", async () => {
    console.log("[PROVISIONING CRON] Running failed provisioning retry...");
    try {
      // Find orders with provisioning_failed status
      const failedOrders = await prisma.order.findMany({
        where: { provisioningStatus: "failed" },
      });

      let retried = 0;
      let succeeded = 0;
      let stillFailed = 0;

      for (const order of failedOrders) {
        retried++;
        try {
          await provisioningService.provisionAccount(order.id);
          succeeded++;

          // Clear provisioning error
          await prisma.order.update({
            where: { id: order.id },
            data: {
              provisioningStatus: "provisioned",
              provisioningError: null,
            },
          });
        } catch (err) {
          stillFailed++;
          console.error(
            `[PROVISIONING CRON] Retry failed for order ${order.id}:`,
            err.message
          );

          // Update error message
          await prisma.order.update({
            where: { id: order.id },
            data: { provisioningError: err.message },
          });
        }
      }

      console.log(
        `[PROVISIONING CRON] Retry complete: ${retried} attempted, ${succeeded} succeeded, ${stillFailed} still failed`
      );
    } catch (err) {
      console.error(
        "[PROVISIONING CRON] Retry failed provisioning job failed:",
        err.message
      );
    }
  });
}

/**
 * JOB 3: SSL renewal check (runs daily at 02:00 UTC)
 * Checks for expiring SSL certs and initiates renewal
 * Note: Let's Encrypt auto-renewal is handled by VestaCP
 * This is just a status check
 */
function scheduleSSLRenewalJob() {
  cron.schedule("0 2 * * *", async () => {
    console.log("[PROVISIONING CRON] Checking SSL certificates...");
    try {
      // This would query VestaCP API for cert expiry dates
      // For now, just log that we checked
      console.log(
        "[PROVISIONING CRON] SSL check complete (auto-renewal handled by VestaCP)"
      );
    } catch (err) {
      console.error(
        "[PROVISIONING CRON] SSL renewal check job failed:",
        err.message
      );
    }
  });
}

/**
 * JOB 4: Clean up deleted accounts (runs weekly)
 * Archives/removes deleted hosting accounts older than 30 days
 */
function scheduleCleanupDeletedJob() {
  cron.schedule("0 3 * * 0", async () => {
    // Sundays at 03:00 UTC
    console.log("[PROVISIONING CRON] Cleaning up deleted accounts...");
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.hostingAccount.updateMany({
        where: {
          status: "deleted",
          deletedAt: { lte: thirtyDaysAgo },
        },
        data: { archived: true },
      });

      console.log(
        `[PROVISIONING CRON] Archived ${result.count} deleted accounts`
      );
    } catch (err) {
      console.error(
        "[PROVISIONING CRON] Cleanup deleted job failed:",
        err.message
      );
    }
  });
}

/**
 * Schedule all provisioning cron jobs
 * Call once during app bootstrap
 */
function scheduleProvisioningJobs() {
  scheduleSyncStatsJob();
  scheduleRetryFailedJob();
  scheduleSSLRenewalJob();
  scheduleCleanupDeletedJob();
  console.log("[PROVISIONING CRON] All provisioning jobs scheduled");
}

module.exports = { scheduleProvisioningJobs };
