/**
 * RunController
 * ------------------------------------------------------------------
 * Provides endpoints to manually trigger automation execution.
 *
 * Responsibilities:
 *  - Allow on-demand execution of a profile
 *  - Delegate execution to Scheduler
 *  - Never execute tasks directly
 *
 * Why this exists:
 *  - Supports manual runs (testing, emergency actions)
 *  - Same execution path as scheduled runs (consistency)
 *
 * Design Principle:
 *  - Single execution pipeline (cron and manual runs behave the same)
 */

class RunController {
  constructor({ profileStore, executor, executionLogStore, audit, scheduler, logger }) {
    this.profileStore = profileStore;
    this.executor = executor;
    this.executionLogStore = executionLogStore;
    this.audit = audit;
    this.scheduler = scheduler;
    this.logger = logger;
  }

  /**
   * Manually run a profile now
   * POST /api/automation/run/:profileId
   */
  async runNow(req, res) {
    try {
      const profileId = Number(req.params.profileId);

      const run = await this.scheduler.runProfileNow(profileId);

      // Audit the manual run
      await this.audit.automation(
        "profile.manual_run",
        { profileId, runId: run.id },
        req.auditContext?.userId || "system"
      );

      return res.success(run);
    } catch (err) {
      this.logger.error("Failed to run profile:", err);
      return res.error(err, 500);
    }
  }
}

module.exports = RunController;