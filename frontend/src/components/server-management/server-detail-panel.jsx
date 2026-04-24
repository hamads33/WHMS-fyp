"use client"

import { useState } from "react"
import {
  X, Globe, Wifi, WifiOff, Wrench, Trash2, RefreshCw,
  Shield, Container, Braces, Code2, Mail, DatabaseBackup,
} from "lucide-react"
import { ServerStatusBadge, ServerTypeBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import { useServerActions, useDeleteServer } from "@/lib/api/servers"
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ── Sparkline for mini metric charts ─────────────────────────────────────────

function Sparkline({ data, color }) {
  const colorId = color.replace(/[^a-z0-9]/gi, "")
  const chartData = (data ?? []).map((v, i) => ({ i, v }))
  if (!chartData.length) return <div style={{ height: 36 }} />
  return (
    <div style={{ height: 36, minHeight: 36 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`dp-${colorId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ background: "oklch(0.155 0.006 264)", border: "1px solid oklch(0.24 0.007 264)", borderRadius: "6px", padding: "4px 8px" }}
            itemStyle={{ color: "oklch(0.94 0.005 264)", fontSize: "11px" }}
            formatter={(v) => [`${Number(v).toFixed(1)}`, ""]}
            labelFormatter={() => ""}
          />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#dp-${colorId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Mini metric card (matches v0 exactly) ────────────────────────────────────

function MetricChart({ label, value, unit = "%", history, color }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {value != null ? Number(value).toFixed(0) : "—"}{unit}
        </span>
      </div>
      <Sparkline data={history} color={color} />
    </div>
  )
}

// ── Capability badge ─────────────────────────────────────────────────────────

function CapBadge({ enabled, icon: Icon, label }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
      enabled
        ? "border-[oklch(0.6_0.2_250/0.3)] bg-[oklch(0.6_0.2_250/0.1)] text-[oklch(0.6_0.2_250)]"
        : "border-border bg-secondary/30 text-muted-foreground/40"
    )}>
      <Icon size={12} />
      {label}
    </span>
  )
}

// ── Action button ────────────────────────────────────────────────────────────

function ActionBtn({ icon: Icon, label, variant = "default", onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "default" && "border-border bg-secondary hover:bg-secondary/80 text-foreground",
        variant === "primary" && "border-[oklch(0.6_0.2_250/0.4)] bg-[oklch(0.6_0.2_250/0.1)] hover:bg-[oklch(0.6_0.2_250/0.2)] text-[oklch(0.6_0.2_250)]",
        variant === "warning" && "border-[oklch(0.72_0.18_70/0.4)] bg-[oklch(0.72_0.18_70/0.1)] hover:bg-[oklch(0.72_0.18_70/0.2)] text-[oklch(0.72_0.18_70)]",
        variant === "danger" && "border-[oklch(0.52_0.22_25/0.4)] bg-[oklch(0.52_0.22_25/0.1)] hover:bg-[oklch(0.52_0.22_25/0.2)] text-[oklch(0.52_0.22_25)]"
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

// ── Main detail panel ────────────────────────────────────────────────────────

export function ServerDetailPanel({ server, onClose }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { testConnection, toggleMaintenance, refreshMetrics, testPending, maintPending } = useServerActions(server.id)
  const { mutate: deleteServer, isPending: deletePending } = useDeleteServer()

  const inMaintenance = server.status === "maintenance"
  const caps = server.capabilities ?? {}
  const accountCount = server._count?.accounts ?? server._count?.managedAccounts ?? 0

  const handleDelete = () => {
    deleteServer(server.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false)
        onClose()
      }
    })
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-secondary/20">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Globe size={18} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-sm">{server.name}</h3>
                <ServerStatusBadge status={server.status} glow={server.status === "active"} />
                <ServerTypeBadge type={server.type} />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{server.hostname}</div>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground/60">
                <span className="font-mono">{server.ipAddress}</span>
                {server.group?.name && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>Group: {server.group.name}</span>
                  </>
                )}
                {server.uptime && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>Uptime: {server.uptime}</span>
                  </>
                )}
                {(server.latency ?? 0) > 0 && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{server.latency}ms</span>
                  </>
                )}
                <span className="text-muted-foreground/40">·</span>
                <span>{accountCount} accounts</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Resource Usage — 4 mini metric charts (matches v0 exactly) */}
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Resource Usage</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricChart
                label="CPU Usage"
                value={server.cpu}
                history={server.cpuHistory}
                color="oklch(0.6 0.2 250)"
              />
              <MetricChart
                label="RAM Usage"
                value={server.ram}
                history={server.ramHistory}
                color="oklch(0.64 0.2 145)"
              />
              <MetricChart
                label="Disk Usage"
                value={server.disk}
                history={server.diskHistory}
                color="oklch(0.72 0.18 70)"
              />
              <MetricChart
                label="Latency"
                value={server.latency}
                unit="ms"
                history={server.latencyHistory}
                color="oklch(0.65 0.2 42)"
              />
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Capabilities</div>
            <div className="flex flex-wrap gap-2">
              <CapBadge enabled={caps.ssl} icon={Shield} label="SSL" />
              <CapBadge enabled={caps.docker} icon={Container} label="Docker" />
              <CapBadge enabled={caps.nodejs} icon={Braces} label="NodeJS" />
              <CapBadge enabled={caps.python} icon={Code2} label="Python" />
              <CapBadge enabled={caps.email} icon={Mail} label="Email" />
              <CapBadge enabled={caps.backups} icon={DatabaseBackup} label="Backups" />
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</div>
            <div className="flex flex-wrap gap-2">
              <ActionBtn
                icon={server.status === "active" ? Wifi : WifiOff}
                label={testPending ? "Testing…" : "Test Connection"}
                onClick={testConnection}
                disabled={testPending}
              />
              <ActionBtn
                icon={Wrench}
                label={maintPending ? "Updating…" : inMaintenance ? "Exit Maintenance" : "Toggle Maintenance"}
                variant="warning"
                onClick={() => toggleMaintenance(!inMaintenance)}
                disabled={maintPending}
              />
              <ActionBtn
                icon={RefreshCw}
                label="Refresh Metrics"
                onClick={refreshMetrics}
              />
              <ActionBtn
                icon={Trash2}
                label="Delete"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deletePending}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete server?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{server.name}</strong> and all associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletePending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
