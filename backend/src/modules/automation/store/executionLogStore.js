const { assertNumber } = require('../lib/guards');

class ExecutionLogStore {
  constructor({ prisma }) {
    this.prisma = prisma;
  }

  async createPending(profileId, taskId = null) {
    const pid = assertNumber(profileId, 'profileId');
    return this.prisma.automationRun.create({
      data: { profileId: pid, taskId: taskId || null, status: 'pending' }
    });
  }

  async updateStatus(runId, status, extra = {}) {
    const rid = assertNumber(runId, 'runId');
    const data = { status };
    if (extra.startedAt) data.startedAt = extra.startedAt;
    if (extra.finishedAt) data.finishedAt = extra.finishedAt;
    return this.prisma.automationRun.update({ where: { id: rid }, data });
  }

  async complete(runId, status, result = null, errorMessage = null) {
    const rid = assertNumber(runId, 'runId');
    return this.prisma.automationRun.update({
      where: { id: rid },
      data: { status, result, errorMessage, finishedAt: new Date() }
    });
  }
}

module.exports = ExecutionLogStore;
