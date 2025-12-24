/**
 * TaskController
 * ------------------------------------------------------------------
 * Manages Automation Tasks belonging to a Profile.
 *
 * Responsibilities:
 *  - CRUD operations for tasks
 *  - Manual task execution via queue
 *  - Maintain execution order inside a profile
 */

class TaskController {
  constructor({
    taskStore,
    profileStore,
    scheduler,
    executor,
    executionLogStore,
    audit,
    logger
  }) {
    this.taskStore = taskStore;
    this.profileStore = profileStore;
    this.scheduler = scheduler;
    this.executor = executor;
    this.executionLogStore = executionLogStore;
    this.audit = audit;
    this.logger = logger;
  }

  // --------------------------------------------------
  // LIST TASKS FOR PROFILE
  // --------------------------------------------------
  async listForProfile(req, res) {
    const profileId = Number(req.params.profileId);

    const profile = await this.profileStore.getById(profileId);
    if (!profile) return res.fail("Profile not found", 404);

    const tasks = await this.taskStore.listForProfile(profileId);
    return res.success(tasks);
  }

  // --------------------------------------------------
  // CREATE TASK
  // --------------------------------------------------
  async createForProfile(req, res) {
    const profileId = Number(req.params.profileId);
    const payload = req.body;

    const profile = await this.profileStore.getById(profileId);
    if (!profile) return res.fail("Profile not found", 404);

    const task = await this.taskStore.create(profileId, payload);

    if (profile.enabled) {
      this.scheduler.scheduleProfile(profile);
    }

    await this.audit.system("automation.task.create", {
      userId: req.auditContext.userId,
      entity: "AutomationTask",
      entityId: task.id,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      data: task
    });

    return res.success(task);
  }

  // --------------------------------------------------
  // GET TASK
  // --------------------------------------------------
  async get(req, res) {
    const taskId = Number(req.params.taskId);

    const task = await this.taskStore.getById(taskId);
    if (!task) return res.fail("Task not found", 404);

    return res.success(task);
  }

  // --------------------------------------------------
  // UPDATE TASK
  // --------------------------------------------------
  async update(req, res) {
    const taskId = Number(req.params.taskId);
    const payload = req.body;

    const task = await this.taskStore.getById(taskId);
    if (!task) return res.fail("Task not found", 404);

    const updated = await this.taskStore.update(taskId, payload);

    const profile = await this.profileStore.getById(task.profileId);
    if (profile?.enabled) {
      this.scheduler.scheduleProfile(profile);
    }

    await this.audit.system("automation.task.update", {
      userId: req.auditContext.userId,
      entity: "AutomationTask",
      entityId: taskId,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      data: payload
    });

    return res.success(updated);
  }

  // --------------------------------------------------
  // DELETE TASK
  // --------------------------------------------------
  async delete(req, res) {
    const taskId = Number(req.params.taskId);

    const task = await this.taskStore.getById(taskId);
    if (!task) return res.fail("Task not found", 404);

    await this.taskStore.delete(taskId);

    const profile = await this.profileStore.getById(task.profileId);
    if (profile?.enabled) {
      this.scheduler.scheduleProfile(profile);
    }

    await this.audit.system("automation.task.delete", {
      userId: req.auditContext.userId,
      entity: "AutomationTask",
      entityId: taskId,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      data: null
    });

    return res.success({ deleted: true });
  }

  // --------------------------------------------------
  // RUN TASK NOW (ASYNC)
  // --------------------------------------------------
  async runNow(req, res) {
    const taskId = Number(req.params.taskId);

    const task = await this.taskStore.getById(taskId);
    if (!task) return res.fail("Task not found", 404);

    const runRecord =
      await this.executionLogStore.createPending(task.profileId, task.id);

    const { createQueue } = require("../queue/jobQueue");
    const { queue } = createQueue("automation");

    await queue.add(
      "run-task",
      {
        profileId: task.profileId,
        taskId: task.id,
        runId: runRecord.id
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 }
      }
    );

    await this.audit.automation(
      "task.run_now",
      {
        profileId: task.profileId,
        taskId: task.id,
        runId: runRecord.id
      },
      req.auditContext.userId
    );

    return res.success({ runId: runRecord.id });
  }
}

module.exports = TaskController;
