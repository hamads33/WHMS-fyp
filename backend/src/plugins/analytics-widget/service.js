/**
 * AnalyticsWidgetService
 * ─────────────────────────────────────────────────────────────────
 * In-memory event counter + activity feed.
 * Tracks hook events fired by the core system.
 */
class AnalyticsWidgetService {
  constructor({ logger } = {}) {
    this.logger  = logger || console;
    this._counts = {
      "order.created"     : 0,
      "invoice.paid"      : 0,
      "service.provision" : 0,
      "service.suspend"   : 0,
      "service.terminate" : 0,
    };
    this._feed = [];   // last 50 activity entries, newest first
    this._startedAt = new Date();
  }

  /** Record a hook event */
  record(event, detail = "") {
    this._counts[event] = (this._counts[event] ?? 0) + 1;
    this._feed.unshift({ event, detail: String(detail).slice(0, 120), ts: new Date().toISOString() });
    if (this._feed.length > 50) this._feed.pop();
    this.logger.info(`[analytics-widget] recorded event: ${event}`);
  }

  getCounts()  { return { ...this._counts }; }
  getFeed(n = 20) { return this._feed.slice(0, n); }
  getStartedAt() { return this._startedAt.toISOString(); }

  getTotal() {
    return Object.values(this._counts).reduce((a, b) => a + b, 0);
  }
}

module.exports = AnalyticsWidgetService;
