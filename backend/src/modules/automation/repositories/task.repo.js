// src/modules/automation/repositories/task.repo.js
const prisma = require('../../../lib/prisma');

/**
 * Create a new task
 */
async function createTask(data) {
  return prisma.task.create({
    data
  });
}

/**
 * Update existing task
 */
async function updateTask(id, data) {
  return prisma.task.update({
    where: { id: Number(id) },
    data
  });
}

/**
 * Get a task by id
 */
async function getTask(id) {
  return prisma.task.findUnique({
    where: { id: Number(id) },
    include: {
      runs: true   // helpful for debugging / viewing run history
    }
  });
}

/**
 * List all tasks for a given profile
 */
async function listTasksByProfile(profileId) {
  return prisma.task.findMany({
    where: { profileId: Number(profileId) },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      actionId: true,
      isActive: true,
      order: true,
      config: true,       // 🔥 FIX: THIS IS REQUIRED
      retries: true,
      backoffMs: true,
      profileId: true,
    }
  });
}

/**
 * Delete a task (CASCADE enabled → Runs auto-delete)
 */
async function deleteTask(id) {
  return prisma.task.delete({
    where: { id: Number(id) }
  });
}
async function getTasksByProfile(profileId) {
  return prisma.task.findMany({
    where: { profileId },
    orderBy: { order: "asc" },
  });
}

async function getAllTasks() {
  return prisma.task.findMany({
    orderBy: [{ profileId: "asc" }, { order: "asc" }],
  });
}

module.exports = {
  createTask,
  updateTask,
  getTask,
  listTasksByProfile,
  deleteTask,
  getTasksByProfile,
  getAllTasks
};
