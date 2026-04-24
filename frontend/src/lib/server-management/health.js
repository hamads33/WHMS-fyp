/**
 * Health score calculation for servers.
 * Score 0–100, derived from CPU, RAM, Disk, and latency.
 */

export function calculateHealthScore(metrics = {}) {
  const { cpu = 0, ram = 0, disk = 0, latency = 0 } = metrics

  // Each component scored 0–100 (higher = better)
  const cpuScore = Math.max(0, 100 - cpu)
  const ramScore = Math.max(0, 100 - ram)
  const diskScore = Math.max(0, 100 - disk)

  // Latency: <50ms = 100, 50–200ms = 60–100, 200–500ms = 20–60, >500ms = 0
  let latencyScore
  if (latency <= 50) latencyScore = 100
  else if (latency <= 200) latencyScore = 100 - ((latency - 50) / 150) * 40
  else if (latency <= 500) latencyScore = 60 - ((latency - 200) / 300) * 40
  else latencyScore = 0

  const score = Math.round(
    cpuScore * 0.3 + ramScore * 0.3 + diskScore * 0.2 + latencyScore * 0.2
  )

  return Math.min(100, Math.max(0, score))
}

export function getHealthStatus(score) {
  if (score >= 70) return "healthy"
  if (score >= 40) return "warning"
  return "critical"
}

export function getHealthColor(score) {
  if (score >= 70) return "emerald"
  if (score >= 40) return "amber"
  return "red"
}

export function getHealthLabel(score) {
  if (score >= 70) return "Healthy"
  if (score >= 40) return "Warning"
  return "Critical"
}

/**
 * Generate demo sparkline data for metric charts
 */
export function generateSparklineData(baseValue, points = 12, variance = 15) {
  return Array.from({ length: points }, (_, i) => ({
    t: i,
    v: Math.min(100, Math.max(0, baseValue + (Math.random() - 0.5) * variance * 2)),
  }))
}

/**
 * Generate time-series metric data for monitoring charts
 */
export function generateMetricsHistory(range = "24h") {
  const points = range === "1h" ? 60 : range === "24h" ? 48 : 84
  const now = Date.now()
  const step = range === "1h" ? 60_000 : range === "24h" ? 1_800_000 : 7_200_000

  return Array.from({ length: points }, (_, i) => ({
    timestamp: new Date(now - (points - i) * step).toISOString(),
    cpu: Math.min(100, Math.max(5, 35 + Math.sin(i / 5) * 20 + Math.random() * 15)),
    ram: Math.min(100, Math.max(10, 55 + Math.sin(i / 8) * 15 + Math.random() * 10)),
    disk: Math.min(100, Math.max(20, 62 + i * 0.05 + Math.random() * 5)),
    latency: Math.max(1, 28 + Math.sin(i / 4) * 20 + Math.random() * 15),
  }))
}

export function formatUptime(seconds) {
  if (!seconds) return "N/A"
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatBytes(gb) {
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${gb} GB`
}
