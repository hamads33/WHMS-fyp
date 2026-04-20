"use client"

import { useState, useMemo } from "react"
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle, Shield, Container, Braces, Code2, Mail, DatabaseBackup } from "lucide-react"
import { ResponsiveContainer, AreaChart, Area } from "recharts"
import { ServerStatusBadge, ServerTypeBadge } from "./status-badge"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ── Health score (mirrors v0 logic) ─────────────────────────────────────────

function getHealthLevel(server) {
  if (server.status === "offline") return "critical"
  if ((server.cpu ?? 0) >= 90 || (server.ram ?? 0) >= 90 || (server.disk ?? 0) >= 90 || (server.latency ?? 0) >= 45) return "critical"
  if ((server.cpu ?? 0) >= 75 || (server.ram ?? 0) >= 75 || (server.disk ?? 0) >= 80 || (server.latency ?? 0) >= 25) return "warning"
  if (server.status === "maintenance") return "warning"
  return "healthy"
}

const healthCfg = {
  healthy:  { label: "Healthy",  dot: "bg-[oklch(0.64_0.2_145)]",  text: "text-[oklch(0.64_0.2_145)]",  glow: "shadow-[0_0_5px_oklch(0.64_0.2_145/0.7)]" },
  warning:  { label: "Warning",  dot: "bg-[oklch(0.72_0.18_70)]",  text: "text-[oklch(0.72_0.18_70)]",  glow: "" },
  critical: { label: "Critical", dot: "bg-[oklch(0.52_0.22_25)]",  text: "text-[oklch(0.52_0.22_25)]",  glow: "" },
}

// ── Inline sparkline (v0 exact) ──────────────────────────────────────────────

function InlineSparkline({ data, color }) {
  const chartData = (data ?? []).map((v, i) => ({ i, v }))
  const colorId = color.replace(/[^a-z0-9]/gi, "")
  if (!chartData.length) return <div style={{ width: 48, height: 20 }} />
  return (
    <div style={{ width: 48, minWidth: 48, height: 20, minHeight: 20, display: "inline-block" }}>
      <ResponsiveContainer width={48} height={20}>
        <AreaChart data={chartData} margin={{ top: 1, right: 0, bottom: 1, left: 0 }}>
          <defs>
            <linearGradient id={`sp-${colorId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sp-${colorId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Usage cell with bar + sparkline ─────────────────────────────────────────

function UsageCell({ value, history, color, alertThreshold }) {
  const v = value ?? 0
  const over = v >= alertThreshold
  const textColor = v >= 95 ? "text-[oklch(0.52_0.22_25)]" : v >= 80 ? "text-[oklch(0.65_0.2_42)]" : v >= 65 ? "text-[oklch(0.72_0.18_70)]" : "text-muted-foreground"
  const barColor  = v >= 95 ? "bg-[oklch(0.52_0.22_25)]"  : v >= 80 ? "bg-[oklch(0.65_0.2_42)]"  : v >= 65 ? "bg-[oklch(0.72_0.18_70)]"  : "bg-[oklch(0.6_0.2_250)]"

  return (
    <div className="flex items-center gap-1.5 min-w-[90px]">
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-0.5">
          <span className={cn("text-xs tabular-nums font-mono w-7 text-right flex-shrink-0", textColor)}>{v.toFixed(0)}%</span>
          {over && <AlertTriangle size={10} className="text-[oklch(0.65_0.2_42)]" />}
        </div>
        <div className="h-0.5 bg-muted rounded-full overflow-hidden w-full">
          <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(100, v)}%` }} />
        </div>
      </div>
      <InlineSparkline data={history} color={color} />
    </div>
  )
}

// ── Capability icons ─────────────────────────────────────────────────────────

function CapIcon({ enabled, icon: Icon, label }) {
  return (
    <span title={label} className={cn("inline-flex", enabled ? "text-[oklch(0.6_0.2_250)]" : "text-border")}>
      <Icon size={11} />
    </span>
  )
}

// ── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, dir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="text-muted-foreground/40" />
  return dir === "asc" ? <ChevronUp size={11} className="text-primary" /> : <ChevronDown size={11} className="text-primary" />
}

const thCls     = "px-2.5 py-1.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
const sortThCls = `${thCls} cursor-pointer select-none hover:text-foreground transition-colors`

// ── Main component ───────────────────────────────────────────────────────────

export function ServerTable({ servers = [], selectedId, onSelect, loading = false }) {
  const [search,       setSearch]  = useState("")
  const [statusFilter, setStatus]  = useState("all")
  const [typeFilter,   setType]    = useState("all")
  const [groupFilter,  setGroup]   = useState("all")
  const [sortKey,      setSortKey] = useState("name")
  const [sortDir,      setSortDir] = useState("asc")

  const groups = useMemo(() => {
    const names = Array.from(new Set(servers.map(s => s.group?.name).filter(Boolean)))
    return ["all", ...names]
  }, [servers])

  const filtered = useMemo(() => {
    let out = servers
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(s => s.name?.toLowerCase().includes(q) || s.hostname?.toLowerCase().includes(q) || s.ipAddress?.includes(q))
    }
    if (statusFilter !== "all") out = out.filter(s => s.status === statusFilter)
    if (typeFilter   !== "all") out = out.filter(s => s.type   === typeFilter)
    if (groupFilter  !== "all") out = out.filter(s => s.group?.name === groupFilter)

    return [...out].sort((a, b) => {
      let av = a[sortKey] ?? "", bv = b[sortKey] ?? ""
      if (typeof av === "string") av = av.toLowerCase()
      if (typeof bv === "string") bv = bv.toLowerCase()
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [servers, search, statusFilter, typeFilter, groupFilter, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-border">
        <div className="relative flex-1 min-w-36">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search servers..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        {([
          { val: statusFilter, set: setStatus, opts: [["all","All Status"],["active","Online"],["offline","Offline"],["maintenance","Maintenance"]] },
          { val: typeFilter,   set: setType,   opts: [["all","All Types"],["mock-cpanel","cPanel"],["mock-vps","VPS"],["mock-cloud","Cloud"]] },
        ]).map(({ val, set, opts }, i) => (
          <select key={i} value={val} onChange={e => set(e.target.value)}
            className="px-2 py-1 text-[11px] bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <select value={groupFilter} onChange={e => setGroup(e.target.value)}
          className="px-2 py-1 text-[11px] bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          {groups.map(g => <option key={g} value={g}>{g === "all" ? "All Groups" : g}</option>)}
        </select>
        <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">{filtered.length} servers</span>
      </div>

      {/* Table */}
      <Table>
        <TableHeader className="bg-secondary/40">
          <TableRow className="border-b border-border">
            <TableHead className={thCls}>Health</TableHead>
            <TableHead className={thCls}>Status</TableHead>
            <TableHead className={sortThCls} onClick={() => toggleSort("name")}>
              <div className="flex items-center gap-1">Name <SortIcon col="name" sortKey={sortKey} dir={sortDir} /></div>
            </TableHead>
            <TableHead className={thCls}>Type / Group</TableHead>
            <TableHead className={sortThCls} onClick={() => toggleSort("cpu")}>
              <div className="flex items-center gap-1">CPU <SortIcon col="cpu" sortKey={sortKey} dir={sortDir} /></div>
            </TableHead>
            <TableHead className={sortThCls} onClick={() => toggleSort("ram")}>
              <div className="flex items-center gap-1">RAM <SortIcon col="ram" sortKey={sortKey} dir={sortDir} /></div>
            </TableHead>
            <TableHead className={sortThCls} onClick={() => toggleSort("disk")}>
              <div className="flex items-center gap-1">Disk <SortIcon col="disk" sortKey={sortKey} dir={sortDir} /></div>
            </TableHead>
            <TableHead className={`${thCls} hidden md:table-cell`}>Uptime</TableHead>
            <TableHead className={`${sortThCls} hidden lg:table-cell`} onClick={() => toggleSort("latency")}>
              <div className="flex items-center gap-1">Latency <SortIcon col="latency" sortKey={sortKey} dir={sortDir} /></div>
            </TableHead>
            <TableHead className={`${sortThCls} hidden lg:table-cell`} onClick={() => toggleSort("accountCount")}>
              <div className="flex items-center gap-1">Accts <SortIcon col="accountCount" sortKey={sortKey} dir={sortDir} /></div>
            </TableHead>
            <TableHead className={`${thCls} hidden xl:table-cell`}>Caps</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/60">
          {loading && Array(5).fill(0).map((_, i) => (
            <TableRow key={i}>
              {Array(11).fill(0).map((__, j) => (
                <TableCell key={j} className="px-2.5 py-2"><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}

          {!loading && filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="px-4 py-8 text-center text-xs text-muted-foreground">
                {servers.length === 0 ? "No servers yet. Add your first server." : "No servers match the current filters."}
              </TableCell>
            </TableRow>
          )}

          {!loading && filtered.map(server => {
            const health     = getHealthLevel(server)
            const cfg        = healthCfg[health]
            const isSelected = selectedId === server.id
            const isOnline   = server.status === "active"
            const caps       = server.capabilities ?? {}

            return (
              <TableRow
                key={server.id}
                onClick={() => onSelect(server)}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected ? "bg-primary/10 hover:bg-primary/15" : isOnline ? "hover:bg-[oklch(0.64_0.2_145/0.04)]" : "hover:bg-secondary/50"
                )}
              >
                {/* Health */}
                <TableCell className="px-2.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot, health === "healthy" && cfg.glow)} />
                    <span className={cn("text-[10px] font-medium", cfg.text)}>{cfg.label}</span>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="px-2.5 py-2">
                  <ServerStatusBadge status={server.status} glow={isOnline} />
                </TableCell>

                {/* Name + IP */}
                <TableCell className="px-2.5 py-2">
                  <div className="font-medium text-foreground text-xs leading-tight">{server.name}</div>
                  <div className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-36">{server.ipAddress}</div>
                </TableCell>

                {/* Type / Group */}
                <TableCell className="px-2.5 py-2">
                  <ServerTypeBadge type={server.type} />
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{server.group?.name ?? "—"}</div>
                </TableCell>

                {/* CPU */}
                <TableCell className="px-2.5 py-2">
                  <UsageCell value={server.cpu} history={server.cpuHistory} color="oklch(0.6 0.2 250)" alertThreshold={85} />
                </TableCell>

                {/* RAM */}
                <TableCell className="px-2.5 py-2">
                  <UsageCell value={server.ram} history={server.ramHistory} color="oklch(0.64 0.2 145)" alertThreshold={85} />
                </TableCell>

                {/* Disk */}
                <TableCell className="px-2.5 py-2">
                  <UsageCell value={server.disk} history={server.diskHistory} color="oklch(0.72 0.18 70)" alertThreshold={90} />
                </TableCell>

                {/* Uptime */}
                <TableCell className="px-2.5 py-2 text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                  {server.uptime || "—"}
                </TableCell>

                {/* Latency */}
                <TableCell className="px-2.5 py-2 text-xs tabular-nums hidden lg:table-cell">
                  {(server.latency ?? 0) > 0 ? (
                    <span className={server.latency > 40 ? "text-[oklch(0.52_0.22_25)]" : server.latency > 20 ? "text-[oklch(0.72_0.18_70)]" : "text-muted-foreground"}>
                      {server.latency}ms
                    </span>
                  ) : <span className="text-muted-foreground/40">—</span>}
                </TableCell>

                {/* Accounts */}
                <TableCell className="px-2.5 py-2 text-xs text-muted-foreground tabular-nums hidden lg:table-cell">
                  {server.accountCount ?? 0}
                </TableCell>

                {/* Capabilities */}
                <TableCell className="px-2.5 py-2 hidden xl:table-cell">
                  <div className="flex items-center gap-0.5">
                    <CapIcon enabled={caps.ssl}     icon={Shield}         label="SSL" />
                    <CapIcon enabled={caps.docker}  icon={Container}      label="Docker" />
                    <CapIcon enabled={caps.nodejs}  icon={Braces}         label="NodeJS" />
                    <CapIcon enabled={caps.python}  icon={Code2}          label="Python" />
                    <CapIcon enabled={caps.email}   icon={Mail}           label="Email" />
                    <CapIcon enabled={caps.backups} icon={DatabaseBackup} label="Backups" />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
