const serverRepo = require("../repositories/server.repository");
const metricsRepo = require("../repositories/server-metrics.repository");
const serverLogRepo = require("../repositories/server-log.repository");
const { resolveDriver } = require("../drivers");

const POLL_INTERVAL_MS = 60 * 1000;
const CPU_ALERT_THRESHOLD = 90;

let _timer = null;
let _webhookService = null;
let _io = null;

function setWebhookService(svc) {
  _webhookService = svc;
}

function setIo(io) {
  _io = io;
}

async function _checkServer(server) {
  try {
    const driver = resolveDriver(server);

    const [connResult, metricsResult] = await Promise.allSettled([
      driver.testConnection(),
      driver.getMetrics(),
    ]);

    if (connResult.status === "rejected") throw connResult.reason;
    if (metricsResult.status === "rejected") throw metricsResult.reason;

    const conn = connResult.value;
    const metrics = metricsResult.value;

    const record = await metricsRepo.create({
      serverId: server.id,
      cpuUsage: metrics.cpuUsage,
      ramUsage: metrics.ramUsage,
      diskUsage: metrics.diskUsage,
      latency: conn.latency,
      uptime: metrics.uptime,
    });

    // Recover offline server back to active
    if (server.status === "offline") {
      await serverRepo.update(server.id, { status: "active" });
      await serverLogRepo.create({
        serverId: server.id,
        action: "SERVER_RECOVERED",
        message: `[Monitor] Server "${server.name}" is back online`,
      });
      if (_io) {
        _io.emit("server:status", { serverId: server.id, status: "active" });
      }
    }

    // Broadcast real-time metrics to all connected admin clients
    if (_io) {
      _io.emit("server:metrics", {
        serverId: server.id,
        cpu: metrics.cpuUsage,
        ram: metrics.ramUsage,
        disk: metrics.diskUsage,
        latency: conn.latency,
        uptime: metrics.uptime,
        recordedAt: record.recordedAt,
      });
    }

    if (metrics.cpuUsage >= CPU_ALERT_THRESHOLD) {
      await serverLogRepo.create({
        serverId: server.id,
        action: "HIGH_CPU_ALERT",
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
      action: "SERVER_UNREACHABLE",
      message: `[Monitor] Server "${server.name}" unreachable: ${e.message}`,
    });

    // Mark active server as offline
    if (server.status === "active") {
      await serverRepo.update(server.id, { status: "offline" }).catch(() => {});
      if (_io) {
        _io.emit("server:status", { serverId: server.id, status: "offline" });
      }
    }

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
    // Check active servers + poll offline ones so we detect recovery
    const [active, offline] = await Promise.all([
      serverRepo.findAll({ status: "active" }),
      serverRepo.findAll({ status: "offline" }),
    ]);
    await Promise.allSettled([...active, ...offline].map(_checkServer));
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

module.exports = { start, stop, setWebhookService, setIo, getMetricsHistory, getLatestMetrics };
