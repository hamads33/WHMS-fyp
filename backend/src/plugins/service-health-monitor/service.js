/**
 * HealthMonitorService
 * ------------------------------------------------------------------
 * Maintains an in-memory registry of service health states.
 * Each service tracked has: status, lastSeen, events[], uptime
 */

const STATES = {
  ACTIVE     : "active",
  SUSPENDED  : "suspended",
  TERMINATED : "terminated",
  UNKNOWN    : "unknown",
};

class HealthMonitorService {
  constructor({ logger = console } = {}) {
    this.logger = logger;
    // Map<serviceId, HealthRecord>
    this._registry = new Map();
    this._startedAt = new Date().toISOString();
  }

  _getOrCreate(serviceId) {
    if (!this._registry.has(serviceId)) {
      this._registry.set(serviceId, {
        serviceId,
        status      : STATES.UNKNOWN,
        events      : [],
        createdAt   : new Date().toISOString(),
        lastSeenAt  : null,
        metadata    : {},
      });
    }
    return this._registry.get(serviceId);
  }

  _pushEvent(serviceId, type, meta = {}) {
    const record = this._getOrCreate(serviceId);
    record.events.push({ type, at: new Date().toISOString(), ...meta });
    record.lastSeenAt = new Date().toISOString();
    // Keep last 50 events per service
    if (record.events.length > 50) record.events.shift();
  }

  onProvision(serviceId, meta = {}) {
    const record = this._getOrCreate(serviceId);
    record.status   = STATES.ACTIVE;
    record.metadata = { ...record.metadata, ...meta };
    this._pushEvent(serviceId, "provisioned", meta);
    this.logger.info(`[health-monitor] Service ${serviceId} provisioned — status: active`);
  }

  onSuspend(serviceId, meta = {}) {
    const record = this._getOrCreate(serviceId);
    record.status = STATES.SUSPENDED;
    this._pushEvent(serviceId, "suspended", meta);
    this.logger.warn(`[health-monitor] Service ${serviceId} suspended`);
  }

  onTerminate(serviceId, meta = {}) {
    const record = this._getOrCreate(serviceId);
    record.status = STATES.TERMINATED;
    this._pushEvent(serviceId, "terminated", meta);
    this.logger.warn(`[health-monitor] Service ${serviceId} terminated`);
  }

  getService(serviceId) {
    return this._registry.get(serviceId) || null;
  }

  listAll() {
    return [...this._registry.values()];
  }

  listByStatus(status) {
    return [...this._registry.values()].filter(r => r.status === status);
  }

  getSummary() {
    const all = this.listAll();
    return {
      total      : all.length,
      active     : all.filter(r => r.status === STATES.ACTIVE).length,
      suspended  : all.filter(r => r.status === STATES.SUSPENDED).length,
      terminated : all.filter(r => r.status === STATES.TERMINATED).length,
      unknown    : all.filter(r => r.status === STATES.UNKNOWN).length,
      monitorUptime: this._startedAt,
    };
  }

  /** Cron check — logs a periodic health summary */
  runHealthCheck() {
    const summary = this.getSummary();
    this.logger.info(
      `[health-monitor] ⏰ Health check — ` +
      `active: ${summary.active}, suspended: ${summary.suspended}, ` +
      `terminated: ${summary.terminated}`
    );
    return summary;
  }
}

module.exports = HealthMonitorService;
