/**
 * TaskStore
 * ------------------------------------------------------------------
 * Data access layer for Automation Tasks.
 *
 * Responsibilities:
 *  - Manage task persistence
 *  - Validate task payload structure
 *  - Ensure tasks belong to valid profiles
 *  - Handle JSON serialization/deserialization properly
 *
 * Important:
 *  - No execution logic here
 *  - Strict separation of data and behavior
 *
 * Why this matters:
 *  - Keeps business logic testable
 *  - Prevents accidental side effects
 */

const { NotFoundError, ValidationError } = require('../lib/errors');
const { assertNumber, isPlainObject } = require('../lib/guards');

class TaskStore {
  constructor({ prisma }) {
    this.prisma = prisma;
  }

  /**
   * Normalize task data from database
   * Ensures actionMeta is always a proper object
   */
  _normalizeTask(task) {
    if (!task) return null;

    // ✅ FIXED: Handle actionMeta as string (from stringification)
    let actionMeta = task.actionMeta;
    
    if (typeof actionMeta === 'string') {
      try {
        actionMeta = JSON.parse(actionMeta);
      } catch (err) {
        console.error('[TaskStore] Failed to parse actionMeta JSON:', err);
        actionMeta = {};
      }
    }

    // Ensure actionMeta is an object
    if (!actionMeta || typeof actionMeta !== 'object' || Array.isArray(actionMeta)) {
      actionMeta = {};
    }

    return {
      ...task,
      actionMeta,
    };
  }

  async listForProfile(profileId) {
    const pid = assertNumber(profileId, 'profileId');
    const tasks = await this.prisma.automationTask.findMany({ 
      where: { profileId: pid },
      orderBy: { order: 'asc' }
    });
    
    return tasks.map(t => this._normalizeTask(t));
  }

  async create(profileId, data) {
    const pid = assertNumber(profileId, 'profileId');
    if (!data || !isPlainObject(data) || !data.actionType) {
      throw new ValidationError('Invalid task payload');
    }

    // ✅ FIXED: Ensure actionMeta is stored as JSON object (not stringified)
    const taskData = {
      actionType: data.actionType,
      actionMeta: data.actionMeta || {},
      order: data.order || 0,
      profileId: pid,
    };

    const task = await this.prisma.automationTask.create({ 
      data: taskData 
    });

    return this._normalizeTask(task);
  }

  async getById(id) {
    const iid = assertNumber(id, 'taskId');
    const task = await this.prisma.automationTask.findUnique({ 
      where: { id: iid } 
    });
    
    return this._normalizeTask(task);
  }

  async update(id, data) {
    const iid = assertNumber(id, 'taskId');
    const existing = await this.getById(iid);
    if (!existing) throw new NotFoundError('Task not found');

    // ✅ FIXED: Preserve actionMeta as object
    const updateData = { ...data };
    if (updateData.actionMeta && typeof updateData.actionMeta === 'string') {
      try {
        updateData.actionMeta = JSON.parse(updateData.actionMeta);
      } catch (err) {
        console.error('[TaskStore] Failed to parse actionMeta during update:', err);
        updateData.actionMeta = {};
      }
    }

    const task = await this.prisma.automationTask.update({ 
      where: { id: iid }, 
      data: updateData 
    });

    return this._normalizeTask(task);
  }

  async delete(id) {
    const iid = assertNumber(id, 'taskId');
    const existing = await this.getById(iid);
    if (!existing) throw new NotFoundError('Task not found');
    return this.prisma.automationTask.delete({ where: { id: iid } });
  }
}

module.exports = TaskStore;