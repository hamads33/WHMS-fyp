const serverLogRepo = require("../repositories/server-log.repository");
const jobRepo = require("../repositories/provisioning-job.repository");
const metricsRepo = require("../repositories/server-metrics.repository");
const serverRepo = require("../repositories/server.repository");

function err(msg, code = 400) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

async function getTimeline(serverId, { limit = 100, range = "24h" } = {}) {
  const server = await serverRepo.findById(serverId);
  if (!server) throw err("Server not found", 404);

  const [logs, jobs, metrics] = await Promise.all([
    serverLogRepo.findByServer(serverId, { limit }),
    jobRepo.findAll({ serverId }),
    metricsRepo.findByServer(serverId, range),
  ]);

  const events = [];

  for (const log of logs) {
    events.push({
      type: "log",
      action: log.action,
      message: log.message,
      timestamp: log.createdAt,
      meta: null,
    });
  }

  for (const job of jobs) {
    events.push({
      type: "provisioning_job",
      action: job.type.toUpperCase(),
      message: `Job ${job.status}: ${job.type} (attempt ${job.attempts})${job.lastError ? ` — ${job.lastError}` : ""}`,
      timestamp: job.updatedAt,
      meta: { jobId: job.id, status: job.status, attempts: job.attempts },
    });
  }

  for (const m of metrics) {
    if (m.cpuUsage >= 90 || m.ramUsage >= 90) {
      events.push({
        type: "monitoring_alert",
        action: m.cpuUsage >= 90 ? "HIGH_CPU_USAGE" : "HIGH_RAM_USAGE",
        message: `CPU: ${m.cpuUsage}%  RAM: ${m.ramUsage}%  Disk: ${m.diskUsage}%`,
        timestamp: m.recordedAt,
        meta: { cpuUsage: m.cpuUsage, ramUsage: m.ramUsage, diskUsage: m.diskUsage, latency: m.latency },
      });
    }
  }

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return { serverId, server: { name: server.name, status: server.status }, timeline: events.slice(0, limit) };
}

module.exports = { getTimeline };
