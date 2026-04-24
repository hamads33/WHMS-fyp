"use client"

import { Server, Wifi, WifiOff, Wrench, Cpu, MemoryStick, HardDrive, Zap, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

const GROUP_COLORS = [
  "oklch(0.6 0.2 250)",
  "oklch(0.64 0.2 145)",
  "oklch(0.72 0.18 70)",
  "oklch(0.65 0.2 42)",
  "oklch(0.52 0.22 25)",
]

function Trend({ value, suffix = "%" }) {
  if (!value) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 tabular-nums">
      <Minus size={9} />0{suffix}
    </span>
  )
  const up = value > 0
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] tabular-nums font-medium",
      up ? "text-[oklch(0.64_0.2_145)]" : "text-[oklch(0.52_0.22_25)]"
    )}>
      {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {up ? "+" : ""}{value}{suffix}
    </span>
  )
}

function StatCard({ label, value, icon: Icon, colorClass, trend, trendSuffix, sub }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-2.5">
      <div className={cn("flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center", colorClass)}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold tabular-nums text-foreground leading-none">{value}</span>
          {trend !== undefined && <Trend value={trend} suffix={trendSuffix} />}
        </div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/50 truncate">{sub}</div>}
      </div>
    </div>
  )
}

function GroupDonut({ servers }) {
  const groupMap = {}
  servers.forEach(s => {
    const name = s.group?.name ?? "Ungrouped"
    groupMap[name] = (groupMap[name] ?? 0) + 1
  })
  const data = Object.entries(groupMap).map(([name, value]) => ({ name, value }))
  if (!data.length) return null

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-3">
      <div className="w-10 h-10 flex-shrink-0" style={{ minWidth: 40, minHeight: 40 }}>
        <ResponsiveContainer width={40} height={40}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={12} outerRadius={20} paddingAngle={2} dataKey="value" isAnimationActive={false} strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} fill={GROUP_COLORS[i % GROUP_COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: "oklch(0.155 0.006 264)", border: "1px solid oklch(0.24 0.007 264)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px" }}
              itemStyle={{ color: "oklch(0.94 0.005 264)" }}
              formatter={(val, name) => [`${val} server${val !== 1 ? "s" : ""}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground mb-1">Groups</div>
        <div className="space-y-0.5">
          {data.slice(0, 4).map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }} />
              <span className="text-[10px] text-muted-foreground/70 truncate">{d.name}</span>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// servers: enriched server objects (with cpu, ram, disk)
// jobs: provisioning job objects
export function StatsCards({ servers = [], jobs = [] }) {
  const total       = servers.length
  const online      = servers.filter(s => s.status === "active").length
  const offline     = servers.filter(s => s.status === "offline").length
  const maintenance = servers.filter(s => s.status === "maintenance").length

  const avgCpu  = total ? Math.round(servers.reduce((a, s) => a + (s.cpu  ?? 0), 0) / total) : 0
  const avgRam  = total ? Math.round(servers.reduce((a, s) => a + (s.ram  ?? 0), 0) / total) : 0
  const avgDisk = total ? Math.round(servers.reduce((a, s) => a + (s.disk ?? 0), 0) / total) : 0

  const activeJobs = jobs.filter(j => j.status === "running" || j.status === "pending").length
  const failedJobs = jobs.filter(j => j.status === "failed").length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-2">
      <StatCard label="Total Servers" value={total}    icon={Server}       colorClass="bg-secondary text-muted-foreground"                                           sub="last 24h" />
      <StatCard label="Online"        value={online}   icon={Wifi}         colorClass="bg-[oklch(0.64_0.2_145/0.15)] text-[oklch(0.64_0.2_145)]"  trend={0}         sub="last hour" />
      <StatCard label="Offline"       value={offline}  icon={WifiOff}      colorClass={offline > 0 ? "bg-[oklch(0.52_0.22_25/0.15)] text-[oklch(0.52_0.22_25)]" : "bg-secondary text-muted-foreground"} trend={0} sub="last hour" />
      <StatCard label="Maintenance"   value={maintenance} icon={Wrench}    colorClass="bg-[oklch(0.72_0.18_70/0.15)] text-[oklch(0.72_0.18_70)]"   trend={0}         sub="last 24h" />
      <StatCard label="Avg CPU"       value={`${avgCpu}%`}  icon={Cpu}     colorClass={avgCpu  >= 80 ? "bg-[oklch(0.52_0.22_25/0.15)] text-[oklch(0.52_0.22_25)]" : "bg-secondary text-muted-foreground"} trend={0} sub="last hour" />
      <StatCard label="Avg RAM"       value={`${avgRam}%`}  icon={MemoryStick} colorClass={avgRam >= 80 ? "bg-[oklch(0.65_0.2_42/0.15)] text-[oklch(0.65_0.2_42)]" : "bg-secondary text-muted-foreground"} trend={0} sub="last hour" />
      <StatCard label="Avg Disk"      value={`${avgDisk}%`} icon={HardDrive}   colorClass="bg-secondary text-muted-foreground"                     trend={0}         sub="last 24h" />
      <StatCard label="Active Jobs"   value={activeJobs}    icon={Zap}         colorClass="bg-[oklch(0.6_0.2_250/0.15)] text-[oklch(0.6_0.2_250)]"  trend={activeJobs > 0 ? activeJobs : 0} trendSuffix=" running" sub="right now" />
      <StatCard label="Failed Jobs"   value={failedJobs}    icon={AlertTriangle} colorClass={failedJobs > 0 ? "bg-[oklch(0.52_0.22_25/0.15)] text-[oklch(0.52_0.22_25)]" : "bg-secondary text-muted-foreground"} trend={failedJobs > 0 ? -failedJobs : 0} trendSuffix=" today" sub="last 24h" />
      <GroupDonut servers={servers} />
    </div>
  )
}
