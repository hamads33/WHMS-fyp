const prisma = require("../../../lib/prisma");
const registry = require("../pluginEngine/pluginRegistry");
const profileRepo = require("../repositories/profile.repo");
const taskRepo = require("../repositories/task.repo");

// Normalize backward compatibility
function normalizeConfig(c) {
  if (!c) return {};
  const cfg = { ...c };
  if (cfg.message && !cfg.body) cfg.body = cfg.message;
  return cfg;
}

/* -----------------------------
 * CREATE TASK
 * -----------------------------*/
async function createTask(req, res, next) {
  try {
    const { profileId, name, actionId, config = {}, order } = req.body;
    const pid = Number(profileId);

    const profile = await profileRepo.getProfile(pid);
    if (!profile) return res.status(404).json({ error: "Profile does not exist" });

    const plugin = registry.get(actionId);
    if (!plugin) {
      return res.status(404).json({ error: "Unknown plugin/actionId" });
    }

    // Check DB plugin state
    const dbPlugin = await prisma.plugin.findUnique({ where: { id: plugin.id } });
    if (dbPlugin && !dbPlugin.enabled) {
      return res.status(400).json({ error: "Plugin is disabled" });
    }

    const task = await taskRepo.createTask({
      profileId: pid,
      name,
      actionId,
      config: normalizeConfig(config),
      order: order ? Number(order) : 0,

      // NEW FIELDS
      pluginVersion: plugin.version || null,
      pluginSource: dbPlugin?.source || "user",
      pluginId: plugin.id
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
}

/* -----------------------------
 * GET TASK
 * -----------------------------*/
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

/* -----------------------------
 * UPDATE TASK
 * -----------------------------*/
async function updateTask(req, res, next) {
  try {
    const id = Number(req.params.id);
    const payload = req.body;

    if (payload.config) payload.config = normalizeConfig(payload.config);

    const plugin = payload.actionId
      ? registry.get(payload.actionId)
      : null;

    if (plugin) {
      payload.pluginVersion = plugin.version;
      payload.pluginSource = "user";
      payload.pluginId = plugin.id;
    }

    const updated = await taskRepo.updateTask(id, payload);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/* -----------------------------
 * DELETE TASK
 * -----------------------------*/
async function deleteTask(req, res, next) {
  try {
    const id = Number(req.params.id);
    await taskRepo.deleteTask(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/* -----------------------------
 * RUN TASK NOW
 * -----------------------------*/
async function runTaskNow(req, res, next) {
  try {
    const id = Number(req.params.id);
    const task = await taskRepo.getTask(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const executor = require("../pluginEngine/executor");
    const result = await executor.executeTask(task, { test: false });

    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
}

async function listTasks(req, res, next) {
  try {
    const { profileId } = req.query;

    let tasks;

    if (profileId) {
      tasks = await taskRepo.getTasksByProfile(Number(profileId));
    } else {
      tasks = await taskRepo.getAllTasks();
    }

    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTask,
  updateTask,
  runTaskNow,
  getTask,
  deleteTask,
  listTasks,
};