const { NotFoundError, ValidationError } = require('../lib/errors');
const { assertNumber, isPlainObject } = require('../lib/guards');

class TaskStore {
  constructor({ prisma }) {
    this.prisma = prisma;
  }

  async listForProfile(profileId) {
    const pid = assertNumber(profileId, 'profileId');
    return this.prisma.automationTask.findMany({ where: { profileId: pid } });
  }

  async create(profileId, data) {
    const pid = assertNumber(profileId, 'profileId');
    if (!data || !isPlainObject(data) || !data.actionType) throw new ValidationError('Invalid task payload');
    return this.prisma.automationTask.create({ data: { ...data, profileId: pid } });
  }

  async getById(id) {
    const iid = assertNumber(id, 'taskId');
    const t = await this.prisma.automationTask.findUnique({ where: { id: iid } });
    return t;
  }

  async update(id, data) {
    const iid = assertNumber(id, 'taskId');
    const existing = await this.getById(iid);
    if (!existing) throw new NotFoundError('Task not found');
    return this.prisma.automationTask.update({ where: { id: iid }, data });
  }

  async delete(id) {
    const iid = assertNumber(id, 'taskId');
    const existing = await this.getById(iid);
    if (!existing) throw new NotFoundError('Task not found');
    return this.prisma.automationTask.delete({ where: { id: iid } });
  }
}

module.exports = TaskStore;
