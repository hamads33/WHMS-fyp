/**
 * Operational Actions
 * ------------------------------------------------------------------
 * Internal system actions that invoke real module jobs without going
 * through HTTP. These are useful for cron automation profiles.
 */

const { syncDomains } = require("../../../domains/jobs/domain-sync.job");
const serverMonitor = require("../../../server-management/services/server-monitor.service");

module.exports = [
  {
    name: "Sync All Domains",
    type: "builtin",
    actionType: "domain.sync_all",
    module: "domains",
    description: "Run a registrar sync across all domains and emit domain change events",
    schema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          title: "Source",
          description: "Optional source tag stored with emitted events",
        },
      },
    },
    async execute(meta, context) {
      const params = meta.input ?? meta;
      const summary = await syncDomains({
        app: context.app,
        source: params.source || "automation",
      });

      context.logger.info({
        msg: "[domain.sync_all] Completed",
        processed: summary.processed,
        updated: summary.updated,
        failed: summary.failed,
      });

      return { success: true, ...summary };
    },
  },

  {
    name: "Run Server Health Check",
    type: "builtin",
    actionType: "server.run_health_check",
    module: "infrastructure",
    description: "Run the server monitoring sweep immediately and emit infrastructure events",
    schema: {
      type: "object",
      properties: {},
    },
    async execute(meta, context) {
      const summary = await serverMonitor.runNow({
        app: context.app,
        source: "automation",
      });

      context.logger.info({
        msg: "[server.run_health_check] Completed",
        checked: summary.checked,
      });

      return { success: true, ...summary };
    },
  },

  {
    name: "Queue Backup Retention Sweep",
    type: "builtin",
    actionType: "backup.run_retention",
    module: "backup",
    description: "Queue an immediate backup retention cleanup job",
    schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          title: "Reason",
          description: "Optional label stored on the retention job payload",
        },
      },
    },
    async execute(meta, context) {
      const params = meta.input ?? meta;
      const { retentionQueue } = require("../../../backup/worker/retentionQueue");
      const job = await retentionQueue.add(
        "retention-manual",
        {
          triggeredBy: "automation",
          reason: params.reason || "Scheduled retention sweep",
          queuedAt: new Date().toISOString(),
        },
        {
          removeOnComplete: true,
        }
      );

      context.logger.info({
        msg: "[backup.run_retention] Queued",
        jobId: job.id,
      });

      return { success: true, queued: true, jobId: job.id };
    },
  },
];
