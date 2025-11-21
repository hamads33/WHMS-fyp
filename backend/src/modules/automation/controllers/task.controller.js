// src/modules/automation/controllers/task.controller.js
const Ajv = require("ajv");
const taskSchema = require("../validators/task.validator");
const ajv = new Ajv();

const validateTask = ajv.compile(taskSchema);

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

async listForProfile(req, res, next) {
  try {
    const profileId = Number(req.params.profileId);

    console.log("DEBUG → req.params.profileId =", req.params.profileId);

    const tasks = await this.taskStore.listForProfile(profileId);

    return res.success(tasks);
  } catch (err) {
    next(err);
  }
}


  async createForProfile(req, res, next) {
    try {
const profileId = Number(req.params.profileId);

      const body = req.body;

      if (!validateTask(body)) {
        return res.fail("Invalid task data", 400, "validation_error", validateTask.errors);
      }

      const profile = await this.profileStore.getById(profileId);
      if (!profile) {
        const err2 = new Error("Profile not found");
        err2.status = 404;
        err2.code = "profile_not_found";
        throw err2;
      }

      const created = await this.taskStore.create(profileId, body);

      await this.audit.log("automation", "task.create", req.user?.username || "system", {
        profileId, taskId: created.id
      });

      if (profile.enabled) this.scheduler.scheduleProfile(profile);

      res.status(201);
      return res.success(created);
    } catch (err) {
      next(err);
    }
  }

  async get(req, res, next) {
    try {
      const id = Number(req.params.id);
      const task = await this.taskStore.getById(id);

      if (!task) {
        const error = new Error("Task not found");
        error.status = 404;
        error.code = "task_not_found";
        throw error;
      }

      return res.success(task);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const body = req.body;

      if (!validateTask(body)) {
        return res.fail("Invalid task data", 400, "validation_error", validateTask.errors);
      }

      const existing = await this.taskStore.getById(id);
      if (!existing) {
        const error = new Error("Task not found");
        error.status = 404;
        error.code = "task_not_found";
        throw error;
      }

      const updated = await this.taskStore.update(id, body);

      await this.audit.log("automation", "task.update", req.user?.username || "system", {
        taskId: id
      });

      const profile = await this.profileStore.getById(existing.profileId);
      if (profile && profile.enabled) this.scheduler.scheduleProfile(profile);

      return res.success(updated);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const id = Number(req.params.id);

      const existing = await this.taskStore.getById(id);
      if (!existing) {
        const error = new Error("Task not found");
        error.status = 404;
        error.code = "task_not_found";
        throw error;
      }

      await this.taskStore.delete(id);

      await this.audit.log("automation", "task.delete", req.user?.username || "system", {
        taskId: id
      });

      const profile = await this.profileStore.getById(existing.profileId);
      if (profile.enabled) this.scheduler.scheduleProfile(profile);

      return res.success({ deleted: id });
    } catch (err) {
      next(err);
    }
  }

  async runNow(req, res, next) {
    try {
      const id = Number(req.params.id);
      const task = await this.taskStore.getById(id);

      if (!task) {
        const error = new Error("Task not found");
        error.status = 404;
        error.code = "task_not_found";
        throw error;
      }

      const profile = await this.profileStore.getById(task.profileId);

      const runRecord = await this.executionLogStore.createPending(profile.id, task.id);

      await this.audit.log("automation", "task.run", req.user?.username || "system", {
        profileId: profile.id,
        taskId: task.id,
        runId: runRecord.id
      });

      (async () => {
        try {
          await this.executionLogStore.updateStatus(runRecord.id, "running", {
            startedAt: new Date()
          });

          const result = await this.executor.run({
            id: profile.id,
            taskId: task.id,
            actionType: task.actionType,
            actionMeta: task.actionMeta || {}
          });

          await this.executionLogStore.complete(runRecord.id, "success", result);

          await this.audit.log("automation", "task.run.complete", "system", {
            runId: runRecord.id
          });
        } catch (err) {
          await this.executionLogStore.complete(runRecord.id, "failed", null, err.message);

          await this.audit.log("automation", "task.run.failed", "system", {
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

module.exports = TaskController;
