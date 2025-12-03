const prisma = require('../../../db/prisma');

const AnalyticsStore = {
  createEvent(evt) {
    return prisma.marketplaceAnalytics.create({ data: evt });
  },

  createActiveInstance(record) {
    return prisma.marketplaceActiveInstance.upsert({
      where: { instanceId: record.instanceId },
      update: { lastSeen: new Date(), meta: record.meta || {} },
      create: {
        productId: record.productId,
        versionId: record.versionId,
        instanceId: record.instanceId,
        userId: record.userId || null,
        lastSeen: new Date(),
        meta: record.meta || {}
      }
    });
  },

  touchActiveInstance(instanceId) {
    return prisma.marketplaceActiveInstance.updateMany({
      where: { instanceId },
      data: { lastSeen: new Date() }
    });
  },

  cleanupStaleInstances(olderThanDate) {
    return prisma.marketplaceActiveInstance.deleteMany({
      where: { lastSeen: { lt: olderThanDate } }
    });
  },

  listActiveInstances(productId, sinceDate = null) {
    const where = { productId };
    if (sinceDate) where.lastSeen = { gte: sinceDate };
    return prisma.marketplaceActiveInstance.findMany({
      where,
      orderBy: { lastSeen: 'desc' }
    });
  },

  createCrash(crash) {
    return prisma.marketplaceCrash.create({ data: crash });
  },

  listCrashes(productId, opts = {}) {
    return prisma.marketplaceCrash.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip: opts.skip || 0,
      take: opts.take || 100
    });
  },

  createPerf(metric) {
    return prisma.marketplacePerfMetric.create({ data: metric });
  },

  listPerf(productId, metric, opts = {}) {
    return prisma.marketplacePerfMetric.findMany({
      where: { productId, metric },
      orderBy: { createdAt: 'desc' },
      skip: opts.skip || 0,
      take: opts.take || 100
    });
  },

  createAggregate(row) {
    return prisma.marketplaceAnalyticsAggregate.upsert({
      where: { productId_date: { productId: row.productId, date: row.date } },
      update: row,
      create: row
    });
  },

  findAggregate(productId, date) {
    return prisma.marketplaceAnalyticsAggregate.findUnique({ where: { productId_date: { productId, date } } });
  },

  listAggregates(productId, fromDate, toDate) {
    return prisma.marketplaceAnalyticsAggregate.findMany({
      where: { productId, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: 'asc' }
    });
  }
};

module.exports = AnalyticsStore;
