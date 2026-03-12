const serverRepo = require("../repositories/server.repository");
const metricsRepo = require("../repositories/server-metrics.repository");
const serverLogRepo = require("../repositories/server-log.repository");
const { resolveDriver } = require("../drivers");

const POLL_INTERVAL_MS = 60 * 1000;
const CPU_ALERT_THRESHOLD = 90;

let _timer = null;
let _webhookService = null;

function setWebhookService(svc) {
  _webhookService = svc;
}

async function _checkServer(server) {
  try {
    const driver = resolveDriver(server);

    const [conn, metrics] = await Promise.all([
      driver.testConnection(),
      driver.getMetrics(),
    ]);

    const record = await metricsRepo.create({
      serverId: server.id,
      cpuUsage: metrics.cpuUsage,
      ramUsage: metrics.ramUsage,
      diskUsage: metrics.diskUsage,
      latency: conn.latency,
      uptime: metrics.uptime,
    });

    if (metrics.cpuUsage >= CPU_ALERT_THRESHOLD) {
      await serverLogRepo.create({
        serverId: server.id,
        action: "SERVER_UPDATED",
        message: `[Monitor] HIGH CPU: ${metrics.cpuUsage}% on "${server.name}"`,
      });
      if (_webhookService) {
        _webhookService.emit("HIGH_CPU_USAGE", {
          server: { id: server.id, name: server.name },
          cpuUsage: metrics.cpuUsage,
        });
      }
    }

    return record;
  } catch (e) {
    await serverLogRepo.create({
      serverId: server.id,
      action: "SERVER_UPDATED",
      message: `[Monitor] Server "${server.name}" unreachable: ${e.message}`,
    });
    if (_webhookService) {
      _webhookService.emit("SERVER_DOWN", {
        server: { id: server.id, name: server.name },
        error: e.message,
      });
    }
  }
}

async function _tick() {
  try {
    const servers = await serverRepo.findAll({ status: "active" });
    await Promise.allSettled(servers.map(_checkServer));
  } catch (e) {
    console.error("[ServerMonitor] tick error:", e.message);
  }
}

async function getMetricsHistory(serverId, range) {
  return metricsRepo.findByServer(serverId, range);
}

async function getLatestMetrics(serverId) {
  return metricsRepo.findLatest(serverId);
}

function start() {
  if (_timer) return;
  _timer = setInterval(_tick, POLL_INTERVAL_MS);
  _tick();
  console.log(`[ServerMonitor] Started (poll every ${POLL_INTERVAL_MS / 1000}s)`);
}

function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { start, stop, setWebhookService, getMetricsHistory, getLatestMetrics };
