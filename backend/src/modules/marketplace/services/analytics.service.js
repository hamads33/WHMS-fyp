const AnalyticsStore = require('../stores/analyticsStore');
const ProductStore = require('../stores/productStore');

const AnalyticsService = {
  // Generic event ingestion
  async track(event) {
    /**
     * expected event: {
     *   productId, versionId?, eventType, meta?
     * }
     */
    const payload = {
      productId: event.productId,
      versionId: event.versionId || null,
      eventType: event.eventType,
      meta: event.meta || {}
    };
    // Write raw event
    await AnalyticsStore.createEvent(payload).catch(()=>{});

    // Quick wins: some events trigger secondary records
    if (event.eventType === 'plugin.heartbeat') {
      // create/upsert active instance
      const instanceId = event.meta && event.meta.instanceId;
      if (instanceId) {
        await AnalyticsStore.createActiveInstance({
          productId: event.productId,
          versionId: event.versionId || null,
          instanceId,
          userId: event.meta.userId || null,
          meta: event.meta
        }).catch(()=>{});
      }
    }

    if (event.eventType === 'plugin.install') {
      // optional: increment counters in product (you already have incrementInstall)
      try {
        await ProductStore.incrementInstall(event.productId);
      } catch(e){}
    }

    if (event.eventType === 'plugin.crash') {
      // create a crash record
      await AnalyticsStore.createCrash({
        productId: event.productId,
        versionId: event.versionId || null,
        userId: event.meta.userId || null,
        message: event.meta.message || 'crash',
        stackTrace: event.meta.stack || null,
        meta: event.meta
      }).catch(()=>{});
    }

    if (event.eventType && event.eventType.startsWith('perf.')) {
      // perf.metric events: eventType = 'perf.action_latency', meta.value numeric
      const metric = (event.meta && event.meta.metric) || event.eventType.replace(/^perf\./,'');
      const value = typeof event.meta.value === 'number' ? event.meta.value : parseFloat(event.meta.value || 0);
      if (!isNaN(value)) {
        await AnalyticsStore.createPerf({
          productId: event.productId,
          versionId: event.versionId || null,
          metric,
          value,
          meta: event.meta
        }).catch(()=>{});
      }
    }
  }
};

module.exports = AnalyticsService;
