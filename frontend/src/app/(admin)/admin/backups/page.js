"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Database, Plus, Play, RefreshCw,
  ShieldCheck, TrendingUp, TrendingDown,
  Zap, AlertTriangle, Radio,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { backupApi } from "@/lib/api/backupClient";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { CreateBackupModal } from "@/components/create-backup-modal";

import { BackupIntelligenceCharts } from "@/components/backup/BackupIntelligenceCharts";
import { BackupHealthMonitor }       from "@/components/backup/BackupHealthMonitor";
import { BackupLifecyclePipeline }   from "@/components/backup/BackupLifecyclePipeline";
import { BackupStorageInsights }     from "@/components/backup/BackupStorageInsights";
import { BackupScheduleHeatmap }     from "@/components/backup/BackupScheduleHeatmap";
import { BackupExplorerTable }       from "@/components/backup/BackupExplorerTable";
import { BackupActivityTimeline }    from "@/components/backup/BackupActivityTimeline";

function StatusCard({ label, meta, children }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
        {meta && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
            {meta}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function BackupDashboard() {
  const { canManageBackups } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [running, setRunning]       = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats]           = useState(null);
  const [health, setHealth]         = useState(null);
  const [lifecycle, setLifecycle]   = useState(null);

  useEffect(() => {
    Promise.allSettled([
      backupApi("/stats"),
      backupApi("/stats/health"),
      backupApi("/analytics/lifecycle-stats"),
    ]).then(([sRes, hRes, lRes]) => {
      if (sRes.status === "fulfilled") setStats(sRes.value.data);
      if (hRes.status === "fulfilled") setHealth(hRes.value.data);
      if (lRes.status === "fulfilled") setLifecycle(lRes.value.data);
    });
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const runBackupNow = async () => {
    try {
      setRunning(true);
      await backupApi("", {
        method: "POST",
        body: JSON.stringify({ name: `Quick Backup ${new Date().toLocaleString()}`, type: "full", retentionDays: 30 }),
      });
      toast.success("Backup started");
      refresh();
    } catch (err) {
      toast.error(err.message || "Failed to start backup");
    } finally {
      setRunning(false);
    }
  };

  // Derived
  const reliabilityScore = health?.healthScore ?? stats?.successRate ?? 0;
  const totalStorageBytes = stats?.totalStorageUsedBytes ?? 0;
  // Cap bar relative to the largest reasonable power-of-10 above current usage
  const storageCapPct = (() => {
    if (!totalStorageBytes) return 0;
    const magnitude = Math.pow(10, Math.ceil(Math.log10(totalStorageBytes + 1)));
    return Math.min(Math.round((totalStorageBytes / magnitude) * 100), 100);
  })();
  const successRate      = stats?.successRate ?? 0;
  const activeJobs       = (stats?.runningBackups ?? 0) + (health?.checks?.queue?.activeJobs ?? 0);
  const queuedJobs       = stats?.queuedBackups ?? health?.checks?.queue?.pendingJobs ?? 0;
  const expiringCount    = lifecycle?.expiring ?? 0;
  const riskLevel        = expiringCount > 5 ? "high" : expiringCount > 0 ? "medium" : "low";
  const healthy          = health?.status === "healthy";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">

        {/* ══ Header ══════════════════════════════════════════════════════════ */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl border border-border bg-primary flex items-center justify-center shadow-sm">
              <Database className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Backup Infrastructure</h1>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  healthy
                    ? "border-border bg-secondary text-foreground"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                )}>
                  <Radio className="h-2.5 w-2.5" />
                  {healthy ? "Operational" : "Degraded"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                System reliability, storage lifecycle, and recovery intelligence
              </p>
            </div>
          </div>

          {/* Action tray */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-border bg-card shadow-sm">
            <Button variant="ghost" size="sm" onClick={refresh} className="gap-1.5 h-8 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            {canManageBackups && (
              <>
                <div className="h-5 w-px bg-border" />
                <Button variant="ghost" size="sm" onClick={runBackupNow} disabled={running} className="gap-1.5 h-8 text-xs">
                  <Play className="h-3 w-3" /> {running ? "Starting..." : "Run Now"}
                </Button>
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 h-8 text-xs rounded-lg">
                  <Plus className="h-3.5 w-3.5" /> New Backup
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ══ Status Strip ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

          <StatusCard label="System Reliability" meta="Live Metric">
            <div className="flex items-end gap-2">
              <span className={cn(
                "text-3xl font-bold tracking-tight leading-none",
                reliabilityScore < 70 ? "text-destructive" : "text-foreground"
              )}>
                {reliabilityScore}<span className="text-lg font-medium text-muted-foreground">%</span>
              </span>
              <ShieldCheck className="h-5 w-5 text-muted-foreground mb-0.5" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {reliabilityScore >= 90 ? "Excellent" : reliabilityScore >= 70 ? "Moderate" : "Attention needed"}
            </p>
          </StatusCard>

          <StatusCard label="Storage Used" meta="Calculated">
            <p className="text-2xl font-bold tracking-tight text-foreground leading-none">
              {formatBytes(totalStorageBytes)}
            </p>
            <div className="space-y-1">
              <Progress value={storageCapPct} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">{stats?.totalBackups ?? 0} total backups</p>
            </div>
          </StatusCard>

          <StatusCard label="Success Probability" meta="Predicted">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-bold tracking-tight leading-none",
                successRate < 70 ? "text-destructive" : "text-foreground"
              )}>
                {successRate}%
              </span>
              {successRate >= 95
                ? <TrendingUp className="h-4 w-4 text-muted-foreground" />
                : <TrendingDown className="h-4 w-4 text-destructive" />}
            </div>
            <p className="text-[10px] text-muted-foreground">{stats?.backupsThisMonth ?? 0} backups this month</p>
          </StatusCard>

          <StatusCard label="Active Jobs" meta="Live">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground leading-none">{activeJobs}</span>
              <span className="text-xs text-muted-foreground">running</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{activeJobs} active · {queuedJobs} queued</span>
            </div>
          </StatusCard>

          <StatusCard label="Retention Risk" meta="Analysis">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-bold tracking-tight leading-none uppercase",
                riskLevel === "high" ? "text-destructive" : "text-foreground"
              )}>
                {riskLevel}
              </span>
              {riskLevel !== "low" && <AlertTriangle className={cn("h-4 w-4", riskLevel === "high" ? "text-destructive" : "text-muted-foreground")} />}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {expiringCount > 0 ? `${expiringCount} expiring soon` : "No critical expirations"}
            </p>
          </StatusCard>
        </div>

        {/* ══ Row 2: Charts (8) + Health (4) ══════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 min-h-[480px]">
            <BackupIntelligenceCharts key={`charts-${refreshKey}`} />
          </div>
          <div className="col-span-12 lg:col-span-4 min-h-[480px]">
            <BackupHealthMonitor key={`health-${refreshKey}`} />
          </div>
        </div>

        {/* ══ Row 3: Lifecycle (4) + Storage (4) + Heatmap (4) ════════════════ */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 min-h-[400px]">
            <BackupLifecyclePipeline key={`lifecycle-${refreshKey}`} />
          </div>
          <div className="col-span-12 lg:col-span-4 min-h-[400px]">
            <BackupStorageInsights key={`storage-${refreshKey}`} />
          </div>
          <div className="col-span-12 lg:col-span-4 min-h-[400px]">
            <BackupScheduleHeatmap key={`heatmap-${refreshKey}`} />
          </div>
        </div>

        {/* ══ Row 4: Explorer ══════════════════════════════════════════════════ */}
        <BackupExplorerTable key={`table-${refreshKey}`} onUpdate={refresh} />

        {/* ══ Row 5: Timeline ══════════════════════════════════════════════════ */}
        <BackupActivityTimeline key={`timeline-${refreshKey}`} />

      </div>

      <CreateBackupModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { toast.success("Backup created"); refresh(); }}
      />
    </div>
  );
}
