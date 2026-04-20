"use client"

import { useEffect, useRef, useState } from "react"
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useServerMetrics } from "@/lib/api/servers"

const MAX_POINTS = 20

function Sparkline({ data, color, height = 48 }) {
  const colorId = color.replace(/[^a-z0-9]/gi, "")
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <div style={{ height, minHeight: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`mg-${colorId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ background: "oklch(0.155 0.006 264)", border: "1px solid oklch(0.24 0.007 264)", borderRadius: "6px", padding: "4px 8px" }}
            itemStyle={{ color: "oklch(0.94 0.005 264)", fontSize: "11px" }}
            formatter={(v) => [`${v.toFixed(1)}`, ""]}
            labelFormatter={() => ""}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#mg-${colorId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricCard({ label, value, unit, history, color, threshold }) {
  const pct    = unit === "%" ? value : null
  const warn   = pct !== null ? pct >= threshold : false
  const crit   = pct !== null ? pct >= 95 : false

  const valColor = crit  ? "text-[oklch(0.52_0.22_25)]"
    : warn   ? "text-[oklch(0.65_0.2_42)]"
    : "text-foreground"

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className={cn("text-sm font-semibold tabular-nums", valColor)} style={{ color: !crit && !warn ? color : undefined }}>
          {value?.toFixed(0) ?? "—"}{unit}
        </span>
      </div>
      <Sparkline data={history} color={color} />
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className={cn(
          "inline-block w-1.5 h-1.5 rounded-full",
          crit ? "bg-[oklch(0.52_0.22_25)]" : warn ? "bg-[oklch(0.65_0.2_42)]" : "bg-[oklch(0.64_0.2_145)]"
        )} />
        <span className="text-muted-foreground/60">
          {crit ? "Critical" : warn ? "Warning" : "Healthy"}
        </span>
      </div>
    </div>
  )
}

export function MetricsCharts({ serverId }) {
  const { data: metrics, isLoading, dataUpdatedAt } = useServerMetrics(serverId)

  // Sliding history window per metric
  const [history, setHistory] = useState({
    cpu:    [],
    ram:    [],
    disk:   [],
    uptime: [],
  })

  const prevDataRef = useRef(null)

  useEffect(() => {
    if (!metrics || metrics === prevDataRef.current) return
    prevDataRef.current = metrics

    setHistory(prev => ({
      cpu:    [...prev.cpu.slice(-(MAX_POINTS - 1)),    metrics.cpuUsage  ?? 0],
      ram:    [...prev.ram.slice(-(MAX_POINTS - 1)),    metrics.ramUsage  ?? 0],
      disk:   [...prev.disk.slice(-(MAX_POINTS - 1)),   metrics.diskUsage ?? 0],
      uptime: [...prev.uptime.slice(-(MAX_POINTS - 1)), (metrics.uptime ?? 0) % 100],
    }))
  }, [metrics, dataUpdatedAt])

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw size={11} className={cn(isLoading && "animate-spin")} />
        <span>Auto-refreshes every 5s</span>
        {lastUpdated && <span className="ml-auto font-mono">{lastUpdated}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="CPU Usage"
          value={metrics?.cpuUsage}
          unit="%"
          history={history.cpu}
          color="oklch(0.6 0.2 250)"
          threshold={85}
        />
        <MetricCard
          label="RAM Usage"
          value={metrics?.ramUsage}
          unit="%"
          history={history.ram}
          color="oklch(0.64 0.2 145)"
          threshold={85}
        />
        <MetricCard
          label="Disk Usage"
          value={metrics?.diskUsage}
          unit="%"
          history={history.disk}
          color="oklch(0.72 0.18 70)"
          threshold={90}
        />
      </div>

      {isLoading && history.cpu.length === 0 && (
        <p className="text-xs text-center text-muted-foreground py-6">Loading metrics…</p>
      )}
    </div>
  )
}
