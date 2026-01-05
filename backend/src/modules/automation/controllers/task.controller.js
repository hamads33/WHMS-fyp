/**
 * TaskController
 * ------------------------------------------------------------------
 * Manages Automation Tasks belonging to a Profile.
 *
 * Responsibilities:
 *  - CRUD operations for tasks
 *  - Manual task execution via queue
 *  - Maintain execution order inside a profile
 *
 * FIXED: Better validation and logging for task creation
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
      this.logger.error("Failed to list tasks:", err);
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

      this.logger.info({
        msg: '[TaskController] Creating task',
        profileId,
        payloadKeys: Object.keys(payload || {}),
        actionType: payload?.actionType,
        actionMetaKeys: Object.keys(payload?.actionMeta || {}),
      });

      const profile = await this.profileStore.getById(profileId);
      if (!profile) return res.fail("Profile not found", 404);

      if (!payload.actionType) {
        return res.fail("actionType is required", 400, "missing_action_type");
      }

      // ✅ FIXED: Validate actionMeta exists and has required fields
      if (!payload.actionMeta || typeof payload.actionMeta !== 'object') {
        return res.fail(
          "actionMeta is required and must be an object",
          400,
          "invalid_action_meta"
        );
      }

      // Log what we're about to save
      this.logger.info({
        msg: '[TaskController] Task payload validated',
        actionType: payload.actionType,
        actionMeta: payload.actionMeta,
      });

      // Build task data with defaults
      const taskData = {
        actionType: payload.actionType,
        actionMeta: payload.actionMeta || {},
        order: typeof payload.order === 'number' ? payload.order : 0
      };

      const task = await this.taskStore.create(profileId, taskData);

      this.logger.info({
        msg: '[TaskController] Task created successfully',
        taskId: task.id,
        profileId,
        actionType: task.actionType,
        actionMeta: task.actionMeta,
      });

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

      this.logger.debug({
        msg: '[TaskController] Retrieved task',
        taskId,
        actionType: task.actionType,
        actionMetaKeys: Object.keys(task.actionMeta || {}),
      });

      return res.success(task);
    } catch (err) {
      this.logger.error("Failed to get task:", err);
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

      this.logger.info({
        msg: '[TaskController] Updating task',
        taskId,
        payloadKeys: Object.keys(payload || {}),
      });

      const task = await this.taskStore.getById(taskId);
      if (!task) return res.fail("Task not found", 404);

      // ✅ FIXED: Validate actionMeta if present
      if (payload.actionMeta && typeof payload.actionMeta !== 'object') {
        return res.fail(
          "actionMeta must be an object",
          400,
          "invalid_action_meta"
        );
      }

      const updated = await this.taskStore.update(taskId, payload);

      this.logger.info({
        msg: '[TaskController] Task updated successfully',
        taskId,
        actionType: updated.actionType,
        actionMeta: updated.actionMeta,
      });

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

      this.logger.info({
        msg: '[TaskController] Task deleted',
        taskId,
      });

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

      // ✅ FIXED: Validate task has required fields before queuing
      if (!task.actionType) {
        return res.fail(
          "Task has no actionType defined",
          400,
          "invalid_task"
        );
      }

      if (!task.actionMeta || typeof task.actionMeta !== 'object' || Object.keys(task.actionMeta).length === 0) {
        return res.fail(
          "Task has no actionMeta or it is empty. Task must be properly configured before execution.",
          400,
          "invalid_task_meta"
        );
      }

      // Create pending run record
      const runRecord = await this.executionLogStore.createPending(
        task.profileId,
        task.id
      );

      // Enqueue job
      const { createQueue } = require("../queue/jobQueue");
      const { queue } = createQueue("automation");

      this.logger.info({
        msg: '[TaskController] Enqueueing task execution',
        taskId,
        runId: runRecord.id,
        actionType: task.actionType,
      });

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
          runId: runRecord.id,
          actionType: task.actionType,
        },
        req.auditContext?.userId || "system"
      );

      return res.success({ runId: runRecord.id }, {}, 202);
    } catch (err) {
      this.logger.error("Failed to run task:", err);
      return res.error(err, 500);
    }
  }
}

module.exports = TaskController;