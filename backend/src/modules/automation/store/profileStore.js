const { NotFoundError, ValidationError } = require('../lib/errors');
const { assertNumber } = require('../lib/guards');

class ProfileStore {
  constructor({ prisma }) {
    this.prisma = prisma;
  }

  async listAll() {
    return this.prisma.automationProfile.findMany({ orderBy: { id: 'asc' } });
  }

  async create(data) {
    if (!data || typeof data !== 'object') throw new ValidationError('Invalid profile data');
    return this.prisma.automationProfile.create({ data });
  }

  async getById(id) {
    const iid = assertNumber(id, 'profileId');
    const p = await this.prisma.automationProfile.findUnique({ where: { id: iid } });
    return p;
  }

  async update(id, data) {
    const iid = assertNumber(id, 'profileId');
    const existing = await this.getById(iid);
    if (!existing) throw new NotFoundError('Profile not found');
    return this.prisma.automationProfile.update({ where: { id: iid }, data });
  }

  async delete(id) {
    const iid = assertNumber(id, 'profileId');
    const existing = await this.getById(iid);
    if (!existing) throw new NotFoundError('Profile not found');
    return this.prisma.automationProfile.delete({ where: { id: iid } });
  }

  async setEnabled(id, enabled) {
    const iid = assertNumber(id, 'profileId');
    const existing = await this.getById(iid);
    if (!existing) throw new NotFoundError('Profile not found');
    return this.prisma.automationProfile.update({ where: { id: iid }, data: { enabled } });
  }
}

module.exports = ProfileStore;
