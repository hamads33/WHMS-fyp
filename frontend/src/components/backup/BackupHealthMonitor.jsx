"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Server, HardDrive, Layers, Zap, Clock, AlertTriangle, CheckCircle2, Radio, Cpu } from "lucide-react";

function StatusPulse({ status }) {
  const ok = status === "up" || status === "healthy";
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={cn(
        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-60",
        ok ? "bg-foreground" : "bg-destructive"
      )} />
      <span className={cn(
        "relative inline-flex rounded-full h-2 w-2",
        ok ? "bg-foreground" : "bg-destructive"
      )} />
    </span>
  );
}

function HealthRing({ score = 90 }) {
  const size = 96;
  const r    = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const label  = score >= 90 ? "Excellent" : score >= 70 ? "Fair" : "Critical";

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={score >= 70 ? "hsl(var(--foreground))" : "hsl(var(--destructive))"}
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0 }} className="flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight leading-none text-foreground">{score}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">/ 100</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

export function BackupHealthMonitor() {
  const [health, setHealth]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backupApi("/stats/health")
      .then((r) => setHealth(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const checks = health?.checks || {};
  const score  = health?.healthScore ?? (health?.status === "healthy" ? 98 : 72);

  const serviceRows = [
    { key: "database", label: "Database",  icon: Server,   status: checks.database?.status || "unknown", detail: checks.database?.latencyMs !== undefined ? `${checks.database.latencyMs}ms` : "—",     sub: "Response latency" },
    { key: "storage",  label: "Storage",   icon: HardDrive,status: checks.storage?.status  || "unknown", detail: checks.storage?.capacityPct  !== undefined ? `${checks.storage.capacityPct}% used` : "Available", sub: "Capacity" },
    { key: "queue",    label: "Job Queue", icon: Layers,   status: checks.queue?.status    || "unknown", detail: `${checks.queue?.activeJobs ?? 0} active`, sub: "Worker load" },
  ];

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary border border-border">
              <Activity className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Infrastructure Health</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Real-time system reliability</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-border bg-secondary text-muted-foreground">
            <Radio className="h-2.5 w-2.5" />
            Live
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        {loading ? (
          <div className="flex-1 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted/30 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Score + uptime */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary border border-border">
              <HealthRing score={score} />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">System Uptime</p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">{health?.uptime ?? 99.9}%</p>
                </div>
                <div className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider",
                  health?.status === "healthy"
                    ? "bg-primary/5 border-primary/20 text-foreground"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                )}>
                  {health?.status === "healthy"
                    ? <CheckCircle2 className="h-3 w-3" />
                    : <AlertTriangle className="h-3 w-3" />}
                  {health?.status === "healthy" ? "All Systems Nominal" : "Degraded"}
                </div>
              </div>
            </div>

            {/* Service rows */}
            <div className="space-y-1.5">
              {serviceRows.map(({ key, label, icon: Icon, status, detail, sub }) => {
                const ok = status === "up" || status === "healthy";
                return (
                  <div key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary border border-border hover:bg-muted/50 transition-colors">
                    <StatusPulse status={status} />
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-none">{label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums">{detail}</span>
                    <Badge variant="outline" className={cn(
                      "text-[9px] px-1.5 py-0 h-4 shrink-0",
                      ok ? "border-border text-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"
                    )}>
                      {ok ? "UP" : "DOWN"}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Queue counters */}
            {checks.queue && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Active", value: checks.queue.activeJobs  ?? 0, icon: Zap   },
                  { label: "Queued", value: checks.queue.pendingJobs  ?? 0, icon: Clock },
                  { label: "Failed", value: checks.queue.failedJobs   ?? 0, icon: AlertTriangle, destructive: (checks.queue.failedJobs ?? 0) > 0 },
                ].map(({ label, value, icon: Icon, destructive }) => (
                  <div key={label} className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border",
                    destructive && value > 0 ? "bg-destructive/8 border-destructive/20" : "bg-secondary border-border"
                  )}>
                    <Icon className={cn("h-3.5 w-3.5", destructive && value > 0 ? "text-destructive" : "text-muted-foreground")} />
                    <span className={cn("text-lg font-bold leading-none tabular-nums", destructive && value > 0 ? "text-destructive" : "text-foreground")}>{value}</span>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {health?.metrics?.runningBackups !== undefined && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary border border-border">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Backup Workers</span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">{health.metrics.runningBackups} running</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
