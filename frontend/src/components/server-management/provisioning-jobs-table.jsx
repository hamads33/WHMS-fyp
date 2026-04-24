"use client"

import { RefreshCw, AlertCircle, Clock } from "lucide-react"
import { JobStatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import { useProvisioningJobs, useRetryProvisioningJob } from "@/lib/api/servers"

function formatTime(iso) {
  if (!iso) return "—"
  const timePart = iso.split("T")[1] ?? ""
  const [hh, mm] = timePart.split(":")
  return `${hh ?? "—"}:${mm ?? "—"} UTC`
}

// Map internal type keys to human-readable labels
const JOB_TYPE_LABELS = {
  create_account:    "Create Account",
  suspend_account:   "Suspend Account",
  terminate_account: "Terminate Account",
}

export function ProvisioningJobsTable() {
  const { data: jobs = [], isLoading } = useProvisioningJobs()
  const { mutate: retryJob, isPending: retrying } = useRetryProvisioningJob()

  const sorted = [...jobs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const activeJobs = jobs.filter(j => j.status === "running" || j.status === "pending").length
  const failedJobs = jobs.filter(j => j.status === "failed").length

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Server</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Attempts</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Error</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Updated</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && Array(4).fill(0).map((_, i) => (
              <tr key={i}>
                {Array(7).fill(0).map((__, j) => (
                  <td key={j} className="px-3 py-2.5">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No provisioning jobs.
                </td>
              </tr>
            )}

            {!isLoading && sorted.map(job => (
              <tr key={job.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="text-xs font-medium text-foreground">
                    {JOB_TYPE_LABELS[job.type] ?? job.type}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">{job.server?.name ?? "—"}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <JobStatusBadge status={job.status} />
                    {job.status === "running" && (
                      <RefreshCw size={12} className="text-[oklch(0.6_0.2_250)] animate-spin" />
                    )}
                    {job.status === "pending" && (
                      <Clock size={12} className="text-[oklch(0.72_0.18_70)]" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn(
                    "text-xs tabular-nums font-mono",
                    job.attempts >= 3 && job.status === "failed" ? "text-[oklch(0.52_0.22_25)]" : "text-muted-foreground"
                  )}>
                    {job.attempts}/3
                  </span>
                </td>
                <td className="px-3 py-2.5 max-w-48">
                  {job.lastError ? (
                    <div className="flex items-start gap-1.5">
                      <AlertCircle size={12} className="flex-shrink-0 text-[oklch(0.52_0.22_25)] mt-0.5" />
                      <span className="text-xs text-[oklch(0.52_0.22_25)] truncate" title={job.lastError}>{job.lastError}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">{formatTime(job.updatedAt)}</span>
                </td>
                <td className="px-3 py-2.5">
                  {job.status === "failed" && job.attempts < 3 && (
                    <button
                      onClick={() => retryJob(job.id)}
                      disabled={retrying}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border border-[oklch(0.6_0.2_250/0.3)] bg-[oklch(0.6_0.2_250/0.1)] text-[oklch(0.6_0.2_250)] hover:bg-[oklch(0.6_0.2_250/0.2)] transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={11} className={retrying ? "animate-spin" : ""} />
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
