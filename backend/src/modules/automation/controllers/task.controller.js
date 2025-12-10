class TaskController {
  constructor({ taskStore, profileStore, scheduler, executor, executionLogStore, audit, logger }) {
    this.taskStore = taskStore;
    this.profileStore = profileStore;
    this.scheduler = scheduler;
    this.executor = executor;
    this.executionLogStore = executionLogStore;
    this.audit = audit;
    this.logger = logger;
  }

  async listForProfile(req, res) {
    const profileId = Number(req.params.profileId);
    const tasks = await this.taskStore.listForProfile(profileId);
    return res.success(tasks);
  }

  async createForProfile(req, res) {
    const profileId = Number(req.params.profileId);
    const data = req.body;

    const t = await this.taskStore.create(profileId, data);

    const p = await this.profileStore.getById(profileId);
    if (p?.enabled) this.scheduler.scheduleProfile(p);

    // SYSTEM AUDIT
    await this.audit.system("automation.task.create", {
      userId: req.auditContext.userId,
      entity: "AutomationTask",
      entityId: t.id,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      data: t
    });

    return res.success(t);
  }

  async get(req, res) {
    const id = Number(req.params.taskId);
    const t = await this.taskStore.getById(id);
    if (!t) return res.fail("Not found", 404);

    return res.success(t);
  }

  async update(req, res) {
    const id = Number(req.params.taskId);
    const data = req.body;

    const t = await this.taskStore.update(id, data);

    const p = await this.profileStore.getById(t.profileId);
    if (p?.enabled) this.scheduler.scheduleProfile(p);

    // SYSTEM AUDIT
    await this.audit.system("automation.task.update", {
      userId: req.auditContext.userId,
      entity: "AutomationTask",
      entityId: id,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      data
    });

    return res.success(t);
  }

  async delete(req, res) {
    const id = Number(req.params.taskId);

    const t = await this.taskStore.getById(id);
    await this.taskStore.delete(id);

    const p = await this.profileStore.getById(t.profileId);
    if (p?.enabled) this.scheduler.scheduleProfile(p);

    // SYSTEM AUDIT
    await this.audit.system("automation.task.delete", {
      userId: req.auditContext.userId,
      entity: "AutomationTask",
      entityId: id,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      data: null
    });

    return res.success({ deleted: true });
  }

  async runNow(req, res) {
    const id = Number(req.params.taskId);

    const t = await this.taskStore.getById(id);
    if (!t) return res.fail("Task not found", 404);

    const runRecord = await this.executionLogStore.createPending(t.profileId, t.id);

    const { createQueue } = require("../queue/jobQueue");
    const { queue } = createQueue("automation");

    await queue.add(
      "run-task",
      {
        profileId: t.profileId,
        taskId: t.id,
        runId: runRecord.id
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 }
      }
    );

    // AUTOMATION AUDIT
    await this.audit.automation(
      "task.run_now",
      { profileId: t.profileId, taskId: t.id, runId: runRecord.id },
      req.auditContext.userId
    );

    return res.success({ runId: runRecord.id });
  }
}

module.exports = TaskController;
