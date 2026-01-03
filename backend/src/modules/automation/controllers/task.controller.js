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

  // ==================================================
  // LIST TASKS FOR PROFILE
  // ==================================================
  async listForProfile(req, res) {
    try {
      const profileId = Number(req.params.profileId);

      const profile = await this.profileStore.getById(profileId);
      if (!profile) return res.fail("Profile not found", 404);

      const tasks = await this.taskStore.listForProfile(profileId);
      return res.success(tasks);
    } catch (err) {
      return res.error(err, 500);
    }
  }

  // ==================================================
  // CREATE TASK
  // ==================================================
  async createForProfile(req, res) {
    try {
      const profileId = Number(req.params.profileId);
      const payload = req.body;

      const profile = await this.profileStore.getById(profileId);
      if (!profile) return res.fail("Profile not found", 404);

      if (!payload.actionType) {
        return res.fail("actionType is required", 400);
      }

      // Build task data with defaults
      const taskData = {
        actionType: payload.actionType,
        actionMeta: payload.actionMeta || {},
        order: typeof payload.order === 'number' ? payload.order : 0
      };

      const task = await this.taskStore.create(profileId, taskData);

      // Re-schedule profile if it's enabled
      if (profile.enabled) {
        this.scheduler.scheduleProfile(profile);
      }

      // Audit the creation
      await this.audit.system("automation.task.create", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationTask",
        entityId: task.id,
        ip: req.auditContext?.ip || null,
        userAgent: req.auditContext?.userAgent || null,
        data: task
      });

      return res.success(task, {}, 201);
    } catch (err) {
      this.logger.error("Failed to create task:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // GET TASK
  // ==================================================
  async get(req, res) {
    try {
      const taskId = Number(req.params.taskId);

      const task = await this.taskStore.getById(taskId);
      if (!task) return res.fail("Task not found", 404);

      return res.success(task);
    } catch (err) {
      return res.error(err, 500);
    }
  }

  // ==================================================
  // UPDATE TASK
  // ==================================================
  async update(req, res) {
    try {
      const taskId = Number(req.params.taskId);
      const payload = req.body;

      const task = await this.taskStore.getById(taskId);
      if (!task) return res.fail("Task not found", 404);

      const updated = await this.taskStore.update(taskId, payload);

      // Re-schedule profile if enabled
      const profile = await this.profileStore.getById(task.profileId);
      if (profile?.enabled) {
        this.scheduler.scheduleProfile(profile);
      }

      // Audit the update
      await this.audit.system("automation.task.update", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationTask",
        entityId: taskId,
        ip: req.auditContext?.ip || null,
        userAgent: req.auditContext?.userAgent || null,
        data: payload
      });

      return res.success(updated);
    } catch (err) {
      this.logger.error("Failed to update task:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // DELETE TASK
  // ==================================================
  async delete(req, res) {
    try {
      const taskId = Number(req.params.taskId);

      const task = await this.taskStore.getById(taskId);
      if (!task) return res.fail("Task not found", 404);

      await this.taskStore.delete(taskId);

      // Re-schedule profile if enabled
      const profile = await this.profileStore.getById(task.profileId);
      if (profile?.enabled) {
        this.scheduler.scheduleProfile(profile);
      }

      // Audit the deletion
      await this.audit.system("automation.task.delete", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationTask",
        entityId: taskId,
        ip: req.auditContext?.ip || null,
        userAgent: req.auditContext?.userAgent || null,
        data: null
      });

      return res.success({ deleted: true });
    } catch (err) {
      this.logger.error("Failed to delete task:", err);
      return res.error(err, 500);
    }
  }

  // ==================================================
  // RUN TASK NOW (ASYNC via Queue)
  // ==================================================
  async runNow(req, res) {
    try {
      const taskId = Number(req.params.taskId);

      const task = await this.taskStore.getById(taskId);
      if (!task) return res.fail("Task not found", 404);

      // Create pending run record
      const runRecord = await this.executionLogStore.createPending(
        task.profileId,
        task.id
      );

      // Enqueue job
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

      // Audit the manual run
      await this.audit.automation(
        "task.run_now",
        {
          profileId: task.profileId,
          taskId: task.id,
          runId: runRecord.id
        },
        req.auditContext?.userId || "system"
      );

      return res.success({ runId: runRecord.id });
    } catch (err) {
      this.logger.error("Failed to run task:", err);
      return res.error(err, 500);
    }
  }
}

module.exports = TaskController;