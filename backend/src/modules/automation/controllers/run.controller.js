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
  constructor({ profileStore, executor, executionLogStore, audit, scheduler }) {
    this.profileStore = profileStore;
    this.executor = executor;
    this.executionLogStore = executionLogStore;
    this.audit = audit;
    this.scheduler = scheduler;
  }

  async runNow(req, res) {
    const profileId = Number(req.params.profileId);

    try {
      const run = await this.scheduler.runProfileNow(profileId);

      // AUTOMATION AUDIT
      await this.audit.automation(
        "profile.manual_run",
        { profileId, runId: run.id },
        req.auditContext.userId
      );

      return res.success(run);
    } catch (err) {
      return res.fail(err.message || "Run failed", 400);
    }
  }
}

module.exports = RunController;
