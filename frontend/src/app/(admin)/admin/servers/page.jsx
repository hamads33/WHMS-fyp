"use client"

import { useState } from "react"
import { Server, Activity, Zap, Users, RefreshCw } from "lucide-react"
import {
  StatsCards,
  ServerTable,
  ServerDetailPanel,
  AccountsTableGlobal,
  ActivityTimeline,
  CreateServerModal,
  ProvisioningJobsTable,
} from "@/components/server-management"
import { useServerDashboard, useProvisioningJobs, useAllServerLogs } from "@/lib/api/servers"
import { useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

// ── Section header — matches v0 exactly ─────────────────────────────────────

function SectionHeader({ icon, title, badge, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {badge !== undefined && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-secondary text-xs text-muted-foreground tabular-nums">
            {badge}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ServersPage() {
  const queryClient = useQueryClient()

  const { data: dashboard = {}, isLoading: dashLoading, dataUpdatedAt } = useServerDashboard()
  const { data: provisioningJobs = [] }                                  = useProvisioningJobs()
  const { data: allLogs = [] }                                            = useAllServerLogs()

  const dashboardServers = dashboard.data ?? []

  const activeJobs = provisioningJobs.filter(j => j.status === "running" || j.status === "pending").length
  const failedJobs = provisioningJobs.filter(j => j.status === "failed").length

  const [selectedServer, setSelectedServer] = useState(null)
  const [showCreate, setShowCreate]         = useState(false)

  function handleSelectServer(server) {
    setSelectedServer(prev => prev?.id === server.id ? null : server)
  }

  const lastSync = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC"
    : "—"

  return (
    <div className="min-h-screen bg-background font-sans">

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Server size={14} className="text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Server Control</span>
            <span className="hidden sm:block text-xs text-muted-foreground/60">/ Infrastructure Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {failedJobs > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[oklch(0.52_0.22_25/0.12)] border border-[oklch(0.52_0.22_25/0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.52_0.22_25)] animate-pulse" />
                <span className="text-xs text-[oklch(0.52_0.22_25)] font-medium">{failedJobs} failed</span>
              </div>
            )}
            {activeJobs > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[oklch(0.6_0.2_250/0.12)] border border-[oklch(0.6_0.2_250/0.2)]">
                <RefreshCw size={12} className="text-[oklch(0.6_0.2_250)] animate-spin" />
                <span className="text-xs text-[oklch(0.6_0.2_250)] font-medium">{activeJobs} running</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground/60 font-mono hidden md:block">
              Last sync: {lastSync}
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["servers"] })
                  queryClient.invalidateQueries({ queryKey: ["provisioning-jobs"] })
                  queryClient.invalidateQueries({ queryKey: ["server-logs"] })
                }}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                title="Refresh"
              >
                <RefreshCw size={14} className={dashLoading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus size={13} />
                Add Server
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="px-4 md:px-6 py-5 space-y-6 max-w-[1600px] mx-auto">

        {/* Stats Row */}
        <section>
          <StatsCards servers={dashboardServers} jobs={provisioningJobs} />
        </section>

        {/* Two-column layout: Servers + Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">

          {/* Left: Server Table + Detail Panel */}
          <div className="space-y-4 min-w-0">
            <section>
              <SectionHeader
                icon={<Server size={15} />}
                title="Servers"
                badge={dashboardServers.length}
              />
              <ServerTable
                servers={dashboardServers}
                selectedId={selectedServer?.id ?? null}
                onSelect={handleSelectServer}
                loading={dashLoading}
              />
            </section>

            {selectedServer && (
              <section>
                <SectionHeader
                  icon={<Activity size={15} />}
                  title="Server Details"
                />
                <ServerDetailPanel
                  server={selectedServer}
                  onClose={() => setSelectedServer(null)}
                />
              </section>
            )}
          </div>

          {/* Right: Activity Timeline */}
          <div className="space-y-4">
            <section>
              <SectionHeader
                icon={<Activity size={15} />}
                title="Activity"
                badge={allLogs.length}
              />
              <div className="rounded-lg border border-border bg-card p-4 overflow-y-auto max-h-[580px]">
                <ActivityTimeline
                  logs={allLogs.slice(0, 60)}
                  emptyMessage="No server activity yet"
                />
              </div>
            </section>
          </div>
        </div>

        {/* Bottom: Accounts + Jobs */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5">

          {/* Hosted Accounts */}
          <section>
            <SectionHeader
              icon={<Users size={15} />}
              title="Hosted Accounts"
              badge={undefined}
            />
            <AccountsTableGlobal />
          </section>

          {/* Provisioning Jobs */}
          <section>
            <SectionHeader
              icon={<Zap size={15} />}
              title="Provisioning Jobs"
              badge={provisioningJobs.length}
              action={
                failedJobs > 0 ? (
                  <span className="text-xs text-[oklch(0.52_0.22_25)]">{failedJobs} failed</span>
                ) : undefined
              }
            />
            <ProvisioningJobsTable />
          </section>
        </div>

      </main>

      {/* Create server modal */}
      <CreateServerModal open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
