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
