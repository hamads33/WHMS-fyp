"use client";

import Link from "next/link";
import {
  Activity, ArrowRight, RotateCcw, Loader2, Zap,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProvisioningJobs, useRetryProvisioningJob } from "@/lib/api/servers";

// ── Status dot with animated pulse for running/failed ─────────────────────────

function StatusDot({ status }) {
  const cfg = {
    pending:   { color: "bg-yellow-400",           pulse: false },
    running:   { color: "bg-blue-500",             pulse: true  },
    completed: { color: "bg-green-500",            pulse: false },
    failed:    { color: "bg-red-500",              pulse: true  },
  }[status] ?? { color: "bg-muted-foreground/40", pulse: false };

  return (
    <span className="relative flex h-2 w-2 shrink-0 mt-1">
      {cfg.pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-60`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.color}`} />
    </span>
  );
}

// ── Status badge label ─────────────────────────────────────────────────────────

function StatusLabel({ status }) {
  const map = {
    pending:   { label: "Pending",   cls: "text-yellow-700 bg-yellow-100 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/40 dark:border-yellow-900" },
    running:   { label: "Running",   cls: "text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-900" },
    completed: { label: "Success",   cls: "text-green-700 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-900" },
    failed:    { label: "Failed",    cls: "text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-900" },
  }[status] ?? { label: status, cls: "text-muted-foreground bg-muted border-border" };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${map.label === "Running" ? "gap-1" : ""} ${map.cls}`}>
      {map.label === "Running" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {map.label}
    </span>
  );
}

function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function ProvisioningActivityFeed() {
  const { data: jobs = [], isLoading } = useProvisioningJobs();
  const { mutate: retryJob, isPending: retryPending, variables: retryingId } = useRetryProvisioningJob();

  const recentJobs = jobs.slice(0, 8);
  const runningCount = jobs.filter(j => j.status === "running").length;
  const failedCount  = jobs.filter(j => j.status === "failed").length;

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              Provisioning Activity
              {runningCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  {runningCount} running
                </span>
              )}
              {failedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
                  <XCircle className="h-2.5 w-2.5" />
                  {failedCount} failed
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Recent provisioning jobs · auto-refreshes
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Link href="/admin/provisioning">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="h-2 w-2 rounded-full shrink-0 mt-1.5" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No provisioning jobs yet</p>
            <p className="text-xs text-muted-foreground mt-1">Jobs appear here when provisioning starts</p>
            <Button size="sm" variant="outline" asChild className="mt-3 gap-1.5">
              <Link href="/admin/provisioning">
                <Zap className="h-3.5 w-3.5" />
                Start Provisioning
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentJobs.map(job => (
              <div key={job.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <StatusDot status={job.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {job.domain ?? job.username ?? `Job ${(job.id ?? "").slice(-8)}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {job.type ?? "Full provision"} · {timeAgo(job.createdAt ?? job.startedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusLabel status={job.status} />
                  {job.status === "failed" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => retryJob(job.id)}
                      disabled={retryPending && retryingId === job.id}
                      title="Retry job"
                    >
                      {retryPending && retryingId === job.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RotateCcw className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
