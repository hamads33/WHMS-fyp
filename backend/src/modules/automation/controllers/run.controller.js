// src/modules/automation/controllers/run.controller.js

class RunController {
  constructor({ profileStore, executor, executionLogStore, audit, scheduler }) {
    this.profileStore = profileStore;
    this.executor = executor;
    this.executionLogStore = executionLogStore;
    this.audit = audit;
    this.scheduler = scheduler;
  }

  async runNow(req, res, next) {
    try {
      const profileId = Number(req.params.profileId);

      const profile = await this.profileStore.getById(profileId);
      if (!profile) {
        const error = new Error("Profile not found");
        error.status = 404;
        error.code = "profile_not_found";
        throw error;
      }

      const runRecord = await this.executionLogStore.createPending(profileId, null);

      await this.audit.log("automation", "profile.run", req.user?.username || "system", {
        profileId, runId: runRecord.id
      });

      (async () => {
        try {
          await this.scheduler.runProfileNow(profileId, runRecord.id);

          await this.audit.log("automation", "profile.run.complete", "system", {
            runId: runRecord.id
          });
        } catch (err) {
          await this.audit.log("automation", "profile.run.failed", "system", {
            runId: runRecord.id,
            error: err.message
          });
        }
      })();

      return res.success({ runId: runRecord.id });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RunController;
