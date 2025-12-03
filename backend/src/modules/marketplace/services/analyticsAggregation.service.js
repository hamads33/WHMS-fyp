const AnalyticsStore = require('../stores/analyticsStore');
const prisma = require('../../../db/prisma');
const { startOfDay, subMinutes } = require('date-fns');

const AggregationService = {
  /**
   * Aggregate one day's metrics for a product
   * - date: JS Date object (UTC midnight)
   */
  async aggregateDay(productId, date) {
    const dayStart = startOfDay(date);
    const nextDay = new Date(dayStart.getTime() + 24*60*60*1000);

    // Count installs (raw events)
    const installs = await prisma.marketplaceAnalytics.count({
      where: {
        productId,
        eventType: 'plugin.install',
        createdAt: { gte: dayStart, lt: nextDay }
      }
    });

    // Count crashes
    const crashes = await prisma.marketplaceCrash.count({
      where: {
        productId,
        createdAt: { gte: dayStart, lt: nextDay }
      }
    });

    // Approx active instances: number of unique instanceId last seen within the day
    const active = await prisma.marketplaceActiveInstance.count({
      where: {
        productId,
        lastSeen: { gte: dayStart, lt: nextDay }
      }
    });

    // Upsert into aggregate table
    const row = {
      productId,
      date: dayStart,
      installs,
      active,
      crashes
    };

    await AnalyticsStore.createAggregate(row).catch(()=>{});
    return row;
  },

  /**
   * Aggregate a range (for backfills)
   */
  async aggregateRange(productId, fromDate, toDate) {
    const rows = [];
    let cursor = new Date(fromDate);
    while (cursor <= toDate) {
      rows.push(await this.aggregateDay(productId, cursor));
      cursor = new Date(cursor.getTime() + 24*60*60*1000);
    }
    return rows;
  },

  /**
   * Run daily aggregation for all active products - used by cron
   */
  async aggregateAllToday() {
    // Find all products (or restrict to active sellers)
    const products = await prisma.marketplaceProduct.findMany({ select: { id: true }});
    const today = startOfDay(new Date());
    for (const p of products) {
      await this.aggregateDay(p.id, today).catch(()=>{});
    }
  }
};

module.exports = AggregationService;
