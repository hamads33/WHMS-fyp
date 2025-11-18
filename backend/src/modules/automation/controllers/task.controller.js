// src/modules/automation/controllers/task.controller.js

const taskRepo = require('../repositories/task.repo');
const profileRepo = require('../repositories/profile.repo');
const automationService = require('../services/automation.service');

// -----------------------------
// Normalize config body/message
// -----------------------------
function normalizeConfig(config) {
  if (!config) return {};

  const c = { ...config };

  // Allow old tasks using "message"
  if (c.message && !c.body) c.body = c.message;

  return c;
}

// -----------------------------
// Create Task
// -----------------------------
async function createTask(req, res, next) {
  try {
    const { profileId, name, actionId, config = {}, order } = req.body;

    const pid = Number(profileId);
    if (!pid) return res.status(400).json({ error: "Invalid profileId" });

    const profile = await profileRepo.getProfile(pid);
    if (!profile) {
      return res.status(404).json({ error: "Profile does not exist" });
    }

    const data = {
      profileId: pid,
      name,
      actionId,
      config: normalizeConfig(config),
      order: Number(order || 0),
      isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
      retries: req.body.retries !== undefined ? Number(req.body.retries) : 3,
      backoffMs: req.body.backoffMs !== undefined ? Number(req.body.backoffMs) : 2000
    };

    const task = await taskRepo.createTask(data);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

// -----------------------------
// Get task
// -----------------------------
async function getTask(req, res, next) {
  try {
    const id = Number(req.params.id);
    const task = await taskRepo.getTask(id);

    if (!task) return res.status(404).json({ error: "Task not found" });

    res.json(task);
  } catch (err) {
    next(err);
  }
}

// -----------------------------
// Update task
// -----------------------------
async function updateTask(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { name, actionId, config = {}, order, isActive, retries, backoffMs } = req.body;

    const updateData = {
      name,
      actionId,
      config: normalizeConfig(config),
      order: order !== undefined ? Number(order) : undefined,
      isActive: isActive !== undefined ? !!isActive : undefined,
      retries: retries !== undefined ? Number(retries) : undefined,
      backoffMs: backoffMs !== undefined ? Number(backoffMs) : undefined
    };

    // Remove "undefined" fields (very important!)
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

    const updatedTask = await taskRepo.updateTask(id, updateData);
    res.json(updatedTask);
  } catch (err) {
    next(err);
  }
}

// -----------------------------
// Delete task
// -----------------------------
async function deleteTask(req, res, next) {
  try {
    const id = Number(req.params.id);

    await taskRepo.deleteTask(id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// -----------------------------
// Run now (manual)
// -----------------------------
async function runTaskNow(req, res, next) {
  try {
    const id = Number(req.params.id);
    const task = await taskRepo.getTask(id);

    if (!task) return res.status(404).json({ error: "Task not found" });

    const result = await automationService.executeTaskRun(task, { test: false });

    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  runTaskNow
};
