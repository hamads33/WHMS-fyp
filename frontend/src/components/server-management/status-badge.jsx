"use client"

import { Badge } from "@/components/ui/badge"

// ── Server status ─────────────────────────────────────────────
// Backend values: "active" | "offline" | "maintenance"

const serverStatusCfg = {
  active:      { label: "Online",      dot: "bg-[oklch(0.64_0.2_145)]",  bg: "bg-[oklch(0.64_0.2_145/0.12)] text-[oklch(0.64_0.2_145)]",  glow: "shadow-[0_0_8px_oklch(0.64_0.2_145/0.35)]" },
  offline:     { label: "Offline",     dot: "bg-[oklch(0.52_0.22_25)]",  bg: "bg-[oklch(0.52_0.22_25/0.12)] text-[oklch(0.52_0.22_25)]",  glow: "" },
  maintenance: { label: "Maintenance", dot: "bg-[oklch(0.72_0.18_70)]",  bg: "bg-[oklch(0.72_0.18_70/0.12)] text-[oklch(0.72_0.18_70)]",  glow: "" },
}

export function ServerStatusBadge({ status, glow = false, className = "" }) {
  const cfg = serverStatusCfg[status] ?? serverStatusCfg.offline
  const isOnline = status === "active"
  return (
    <Badge
      variant="outline"
      className={`border-none gap-1 ${cfg.bg} ${glow && isOnline ? cfg.glow : ""} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${glow && isOnline ? "animate-pulse shadow-[0_0_4px_oklch(0.64_0.2_145/0.8)]" : ""}`} />
      {cfg.label}
    </Badge>
  )
}

// ── Server type ───────────────────────────────────────────────
// Backend values: "mock-cpanel" | "mock-vps" | "mock-cloud"

const serverTypeCfg = {
  "mock-cpanel": { label: "cPanel",   bg: "bg-[oklch(0.6_0.2_250/0.12)] text-[oklch(0.6_0.2_250)]" },
  "mock-vps":    { label: "VPS",      bg: "bg-[oklch(0.72_0.18_70/0.12)] text-[oklch(0.72_0.18_70)]" },
  "mock-cloud":  { label: "Cloud",    bg: "bg-[oklch(0.64_0.2_145/0.12)] text-[oklch(0.64_0.2_145)]" },
}

export function ServerTypeBadge({ type, className = "" }) {
  const cfg = serverTypeCfg[type] ?? { label: type ?? "Unknown", bg: "bg-muted text-muted-foreground" }
  return (
    <Badge variant="outline" className={`border-none ${cfg.bg} ${className}`}>
      {cfg.label}
    </Badge>
  )
}

// ── Provisioning job status ───────────────────────────────────

const jobStatusCfg = {
  pending:   { label: "Pending",   bg: "bg-[oklch(0.72_0.18_70/0.12)] text-[oklch(0.72_0.18_70)]" },
  running:   { label: "Running",   bg: "bg-[oklch(0.6_0.2_250/0.12)] text-[oklch(0.6_0.2_250)]" },
  completed: { label: "Completed", bg: "bg-[oklch(0.64_0.2_145/0.12)] text-[oklch(0.64_0.2_145)]" },
  failed:    { label: "Failed",    bg: "bg-[oklch(0.52_0.22_25/0.12)] text-[oklch(0.52_0.22_25)]" },
}

export function JobStatusBadge({ status, className = "" }) {
  const cfg = jobStatusCfg[status] ?? jobStatusCfg.pending
  return (
    <Badge variant="outline" className={`border-none ${cfg.bg} ${className}`}>
      {cfg.label}
    </Badge>
  )
}

// ── Account status ────────────────────────────────────────────

const accountStatusCfg = {
  active:     { label: "Active",     bg: "bg-[oklch(0.64_0.2_145/0.12)] text-[oklch(0.64_0.2_145)]" },
  suspended:  { label: "Suspended",  bg: "bg-[oklch(0.72_0.18_70/0.12)] text-[oklch(0.72_0.18_70)]" },
  terminated: { label: "Terminated", bg: "bg-[oklch(0.52_0.22_25/0.12)] text-[oklch(0.52_0.22_25)]" },
}

export function AccountStatusBadge({ status, className = "" }) {
  const cfg = accountStatusCfg[status] ?? accountStatusCfg.active
  return (
    <Badge variant="outline" className={`border-none ${cfg.bg} ${className}`}>
      {cfg.label}
    </Badge>
  )
}
