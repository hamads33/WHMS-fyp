/**
 * ProfileStore
 * ------------------------------------------------------------------
 * Repository for Automation Profiles
 */

const { NotFoundError, ValidationError } = require('../lib/errors')
const { assertNumber } = require('../lib/guards')

class ProfileStore {
  constructor({ prisma }) {
    this.prisma = prisma
  }

  // 🔹 BASIC LIST (raw)
  async listAll() {
    return this.prisma.automationProfile.findMany({
      orderBy: { id: 'asc' }
    })
  }

  // 🔹 ENRICHED LIST (FOR UI)
  async listWithMeta() {
    const profiles = await this.prisma.automationProfile.findMany({
      orderBy: { id: 'asc' },
      include: {
        tasks: true,
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    return profiles.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      cron: p.cron,
      enabled: p.enabled,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,

      // ✅ UI fields
      taskCount: p.tasks.length,
      lastRunStatus: p.runs[0]?.status ?? null,
      lastRunAt: p.runs[0]?.createdAt ?? null
    }))
  }

  async create(data) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid profile data')
    }
    return this.prisma.automationProfile.create({ data })
  }

  async getById(id) {
    const iid = assertNumber(id, 'profileId')
    return this.prisma.automationProfile.findUnique({
      where: { id: iid }
    })
  }

  async update(id, data) {
    const iid = assertNumber(id, 'profileId')
    const existing = await this.getById(iid)
    if (!existing) throw new NotFoundError('Profile not found')

    return this.prisma.automationProfile.update({
      where: { id: iid },
      data
    })
  }

  async delete(id) {
    const iid = assertNumber(id, 'profileId')
    const existing = await this.getById(iid)
    if (!existing) throw new NotFoundError('Profile not found')

    return this.prisma.automationProfile.delete({
      where: { id: iid }
    })
  }

  async setEnabled(id, enabled) {
    const iid = assertNumber(id, 'profileId')
    const existing = await this.getById(iid)
    if (!existing) throw new NotFoundError('Profile not found')

    return this.prisma.automationProfile.update({
      where: { id: iid },
      data: { enabled }
    })
  }
}

module.exports = ProfileStore
