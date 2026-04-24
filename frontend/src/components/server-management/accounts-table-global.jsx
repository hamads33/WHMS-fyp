"use client"

import { useState, useMemo } from "react"
import { Search, Ban, Trash2 } from "lucide-react"
import { AccountStatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import { useAllAccounts, useSuspendAccount, useTerminateAccount } from "@/lib/api/servers"

// ── Usage bar with used/total display (v0 pattern) ───────────────────────────

function getUsageColor(pct) {
  if (pct >= 95) return "[&>*]:bg-[oklch(0.52_0.22_25)]"
  if (pct >= 80) return "[&>*]:bg-[oklch(0.65_0.2_42)]"
  if (pct >= 65) return "[&>*]:bg-[oklch(0.72_0.18_70)]"
  return "[&>*]:bg-[oklch(0.6_0.2_250)]"
}

function getUsageTextColor(pct) {
  if (pct >= 95) return "text-[oklch(0.52_0.22_25)]"
  if (pct >= 80) return "text-[oklch(0.65_0.2_42)]"
  if (pct >= 65) return "text-[oklch(0.72_0.18_70)]"
  return "text-muted-foreground"
}

function UsageBarWithMB({ usedMB, limitMB, className = "" }) {
  const usedGB  = (usedMB  / 1024).toFixed(1)
  const limitGB = (limitMB / 1024).toFixed(1)
  const pct     = limitMB > 0 ? Math.round((usedMB / limitMB) * 100) : 0
  const textColor = getUsageTextColor(pct)
  const barColor  = pct >= 95 ? "bg-[oklch(0.52_0.22_25)]" : pct >= 80 ? "bg-[oklch(0.65_0.2_42)]" : pct >= 65 ? "bg-[oklch(0.72_0.18_70)]" : "bg-[oklch(0.6_0.2_250)]"

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between items-center">
        <span className={cn("text-xs tabular-nums font-mono", textColor)}>{usedGB}/{limitGB}GB</span>
        <span className={cn("text-xs tabular-nums", textColor)}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function AccountsTableGlobal() {
  const { data: accounts = [], isLoading } = useAllAccounts()
  const { mutate: suspend,   isPending: suspendPending }   = useSuspendAccount()
  const { mutate: terminate, isPending: terminatePending } = useTerminateAccount()

  const [search,       setSearch]  = useState("")
  const [statusFilter, setStatus]  = useState("all")

  const filtered = useMemo(() => {
    let out = accounts
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(a => a.domain?.toLowerCase().includes(q) || a.server?.name?.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") out = out.filter(a => a.status === statusFilter)
    return out
  }, [accounts, search, statusFilter])

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <div className="relative flex-1 min-w-36">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="px-2 py-1.5 text-xs bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} accounts</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Domain</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-36">Disk</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-36">Bandwidth</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">DBs</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Emails</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array(5).fill(0).map((_, i) => (
              <tr key={i}>
                {Array(7).fill(0).map((__, j) => (
                  <td key={j} className="px-3 py-2.5">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No accounts match the current filters.
                </td>
              </tr>
            )}

            {!isLoading && filtered.map(account => (
              <tr key={account.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="font-medium text-foreground text-xs">{account.domain}</span>
                  {account.server?.name && (
                    <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{account.server.name}</div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <AccountStatusBadge status={account.status} />
                </td>
                <td className="px-3 py-2.5 min-w-36">
                  <UsageBarWithMB usedMB={account.diskUsedMB ?? 0} limitMB={account.diskLimitMB ?? 5120} />
                </td>
                <td className="px-3 py-2.5 min-w-36">
                  <UsageBarWithMB usedMB={account.bandwidthUsedMB ?? 0} limitMB={account.bandwidthLimitMB ?? 102400} />
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums hidden md:table-cell">
                  {account.databaseUsed ?? 0}/{account.databaseLimit ?? 5}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums hidden md:table-cell">
                  {account.emailUsed ?? 0}/{account.emailLimit ?? 10}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      title="Suspend account"
                      disabled={account.status !== "active" || suspendPending}
                      onClick={() => suspend(account.id)}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        account.status === "active"
                          ? "text-[oklch(0.72_0.18_70)] hover:bg-[oklch(0.72_0.18_70/0.15)]"
                          : "text-muted-foreground/30 cursor-not-allowed"
                      )}
                    >
                      <Ban size={13} />
                    </button>
                    <button
                      title="Terminate account"
                      disabled={account.status === "terminated" || terminatePending}
                      onClick={() => terminate(account.id)}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        account.status !== "terminated"
                          ? "text-[oklch(0.52_0.22_25)] hover:bg-[oklch(0.52_0.22_25/0.15)]"
                          : "text-muted-foreground/30 cursor-not-allowed"
                      )}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
