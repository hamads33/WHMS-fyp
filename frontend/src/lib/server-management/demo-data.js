/**
 * Demo/fallback data for when API returns empty or fails.
 * Also used for Storybook / visual testing.
 */

import { calculateHealthScore } from "./health"

const TYPES = ["cpanel", "vps", "cloud", "dedicated"]
const GROUPS = ["Production", "Staging", "Development", "EU-West", "US-East", "APAC"]
const STATUSES = ["active", "active", "active", "maintenance", "offline"]
const CAPABILITIES = ["ssl", "docker", "nodejs", "python", "email", "backups"]

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function makeDemoServer(i) {
  const cpu = rnd(5, 90)
  const ram = rnd(20, 85)
  const disk = rnd(30, 95)
  const latency = rnd(5, 450)
  const healthScore = calculateHealthScore({ cpu, ram, disk, latency })
  const caps = CAPABILITIES.filter(() => Math.random() > 0.4)

  return {
    id: `srv-${String(i).padStart(3, "0")}`,
    name: `server-${String(i).padStart(2, "0")}.${pick(["nyc", "ams", "sgp", "lon", "fra"])}.infra`,
    hostname: `host-${String(i).padStart(3, "0")}.example.com`,
    ipAddress: `${rnd(10, 192)}.${rnd(0, 255)}.${rnd(0, 255)}.${rnd(1, 254)}`,
    type: pick(TYPES),
    group: pick(GROUPS),
    status: pick(STATUSES),
    metrics: { cpu, ram, disk, latency },
    healthScore,
    uptime: rnd(60, 7_776_000), // seconds
    accountCount: rnd(0, 350),
    capabilities: caps,
    lastActivity: new Date(Date.now() - rnd(60_000, 86_400_000)).toISOString(),
    createdAt: new Date(Date.now() - rnd(30, 730) * 86_400_000).toISOString(),
    driver: pick(["cpanel", "plesk", "directadmin", "custom"]),
    port: pick([2083, 2087, 8080, 443]),
    tags: [],
  }
}

export function makeDemoServers(n = 12) {
  return Array.from({ length: n }, (_, i) => makeDemoServer(i + 1))
}

export function makeDemoJob(i, status) {
  const statuses = status ? [status] : ["pending", "running", "completed", "failed"]
  return {
    id: `job-${String(i).padStart(4, "0")}`,
    type: pick(["create_account", "suspend_account", "terminate_account", "migrate", "backup", "ssl_install"]),
    status: pick(statuses),
    serverId: `srv-${String(rnd(1, 12)).padStart(3, "0")}`,
    serverName: `server-${String(rnd(1, 12)).padStart(2, "0")}.nyc.infra`,
    domain: `client${i}.example.com`,
    createdAt: new Date(Date.now() - rnd(60_000, 3_600_000)).toISOString(),
    startedAt: Math.random() > 0.3 ? new Date(Date.now() - rnd(30_000, 1_800_000)).toISOString() : null,
    completedAt: Math.random() > 0.5 ? new Date(Date.now() - rnd(0, 900_000)).toISOString() : null,
    attempts: rnd(1, 4),
    maxAttempts: 3,
    error: Math.random() > 0.7 ? "Connection timeout: remote host did not respond within 30s" : null,
    duration: rnd(500, 45_000),
  }
}

export function makeDemoJobs(n = 24) {
  return Array.from({ length: n }, (_, i) => makeDemoJob(i + 1))
}

export function makeDemoDashboardStats(servers) {
  const active = servers.filter((s) => s.status === "active").length
  const offline = servers.filter((s) => s.status === "offline").length
  const maintenance = servers.filter((s) => s.status === "maintenance").length
  const avgCpu = Math.round(servers.reduce((a, s) => a + s.metrics.cpu, 0) / servers.length)
  const avgRam = Math.round(servers.reduce((a, s) => a + s.metrics.ram, 0) / servers.length)
  const avgDisk = Math.round(servers.reduce((a, s) => a + s.metrics.disk, 0) / servers.length)
  const totalAccounts = servers.reduce((a, s) => a + s.accountCount, 0)

  return {
    totalServers: servers.length,
    active,
    offline,
    maintenance,
    avgCpu,
    avgRam,
    avgDisk,
    totalAccounts,
    jobsQueued: rnd(2, 18),
    jobsRunning: rnd(0, 6),
    jobsFailed: rnd(0, 4),
    alertsCount: rnd(0, 8),
  }
}
