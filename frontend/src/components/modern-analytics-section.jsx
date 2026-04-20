"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";
import {
  BarChart3, Activity, CheckCircle2, AlertCircle, Server, HardDrive,
  Layers, TrendingUp, TrendingDown, Clock, Database,
  AlertTriangle, Zap, ShieldCheck, Radio, Cpu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Micro components ──────────────────────────────────────────────────────────

function LiveBadge({ label = "Live Metrics" }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      {label}
    </span>
  );
}

function SystemBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-muted/40 bg-muted/20 text-muted-foreground">
      {label}
    </span>
  );
}

function StatusDot({ status }) {
  const ok = status === "up" || status === "healthy";
  return (
    <span className={cn(
      "h-2 w-2 rounded-full shrink-0",
      ok ? "bg-emerald-500 shadow-[0_0_6px_1px_rgba(16,185,129,0.5)] animate-pulse" : "bg-red-500 shadow-[0_0_6px_1px_rgba(239,68,68,0.5)]"
    )} />
  );
}

function HealthRing({ score = 90 }) {
  const size = 88;
  const radius = size / 2 - 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ringColor =
    score >= 90 ? "#10b981" :
    score >= 70 ? "#f59e0b" :
    "#ef4444";

  const label =
    score >= 90 ? "Excellent" :
    score >= 70 ? "Moderate" :
    "Critical";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={ringColor} strokeWidth="7"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0 }} className="flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground leading-none">{score}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">/ 100</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: ringColor }}>{label}</span>
    </div>
  );
}

function RiskBar({ pct7 = 0, pct30 = 0, pctExpired = 0 }) {
  const total = pct7 + pct30 + pctExpired;
  if (total === 0) {
    return (
      <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full w-full bg-emerald-500/40 rounded-full" />
      </div>
    );
  }
  return (
    <div className="h-3 rounded-full overflow-hidden flex gap-px bg-muted/20">
      {pctExpired > 0 && (
        <div className="h-full bg-red-500 rounded-l-full" style={{ width: `${pctExpired}%` }} title={`${pctExpired}% expired`} />
      )}
      {pct7 > 0 && (
        <div className="h-full bg-amber-400" style={{ width: `${pct7}%` }} title={`${pct7}% expiring in 7d`} />
      )}
      {pct30 > 0 && (
        <div className="h-full bg-emerald-500 rounded-r-full" style={{ width: `${pct30}%` }} title={`${pct30}% expiring in 30d`} />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ModernAnalyticsSection() {
  const [timeline, setTimeline] = useState([]);
  const [health, setHealth] = useState(null);
  const [successRate, setSuccessRate] = useState(null);
  const [storageGrowth, setStorageGrowth] = useState(null);
  const [retention, setRetention] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      backupApi("/analytics/timeline?period=7d"),
      backupApi("/stats/health"),
      backupApi("/analytics/success-rate"),
      backupApi("/analytics/storage-usage"),
      backupApi("/retention/summary"),
    ]).then(([timelineRes, healthRes, srRes, storageRes, retentionRes]) => {
      if (timelineRes.status === "fulfilled") setTimeline(timelineRes.value.data?.timeline || []);
      if (healthRes.status === "fulfilled") setHealth(healthRes.value.data);
      if (srRes.status === "fulfilled") setSuccessRate(srRes.value.data);
      if (storageRes.status === "fulfilled") setStorageGrowth(storageRes.value.data);
      if (retentionRes.status === "fulfilled") setRetention(retentionRes.value.data);
    }).catch((err) => console.error("Analytics load error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-muted/40 bg-white/70 dark:bg-zinc-900/60 p-6 animate-pulse">
          <div className="h-5 w-52 bg-muted rounded mb-6" />
          <div className="space-y-3">{[...Array(7)].map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="flex-1 h-8 bg-muted rounded" />
            </div>
          ))}</div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-muted/40 bg-white/70 dark:bg-zinc-900/60 p-6 animate-pulse h-60" />
          <div className="rounded-2xl border border-muted/40 bg-white/70 dark:bg-zinc-900/60 p-6 animate-pulse h-52" />
        </div>
      </div>
    );
  }

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const maxTotal = Math.max(...timeline.map((d) => d.total || 0), 1);
  const totalSuccessful = timeline.reduce((s, d) => s + (d.successful || 0), 0);
  const totalFailed = timeline.reduce((s, d) => s + (d.failed || 0), 0);
  const totalRunning = timeline.reduce((s, d) => s + (d.running || 0), 0);
  const totalStorage = timeline.reduce((s, d) => s + (d.storageUsedBytes || 0), 0);

  const computedSuccessRate =
    successRate?.successRate ??
    (totalSuccessful + totalFailed > 0
      ? Math.round((totalSuccessful / (totalSuccessful + totalFailed)) * 100)
      : 0);

  const weeklyChange = timeline.length >= 2
    ? Math.round(((timeline[timeline.length - 1].total - timeline[0].total) / (timeline[0].total || 1)) * 100)
    : 0;

  const avgSize = totalSuccessful > 0 ? totalStorage / totalSuccessful : 0;

  const failureProbability =
    computedSuccessRate >= 97 ? "Failure probability low" :
    computedSuccessRate >= 85 ? "Minor failure risk detected" :
    "Elevated failure risk";

  const growthInsight =
    weeklyChange > 10 ? "Storage growth accelerating" :
    weeklyChange > 0 ? "Growth stable" :
    "Storage footprint reduced";

  const systemInsight = computedSuccessRate >= 95 ? "System performing normally" : "Performance degraded";

  // Retention risk calculations
  const exp7 = retention?.expiringWithin7Days ?? 0;
  const exp30 = retention?.expiringWithin30Days ?? 0;
  const expExpired = retention?.expiredBackups ?? 0;
  const totalR = exp7 + exp30 + expExpired;
  const retentionHealthy = exp7 === 0 && expExpired === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">

      {/* ══════════════════════════════════════════════════════════════════════
          PANEL 1 — Backup Intelligence
      ══════════════════════════════════════════════════════════════════════ */}
      <Card className="lg:col-span-2 bg-gradient-to-br from-white/90 via-white/70 to-slate-50/60 dark:from-zinc-900/80 dark:via-zinc-900/60 dark:to-zinc-950/50 backdrop-blur-sm rounded-2xl border border-muted/40 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-400/20">
                <BarChart3 className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                  Backup Intelligence
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">7-day activity trend analysis</CardDescription>
              </div>
            </div>
            <LiveBadge />
          </div>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* Top summary row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Success Rate",
                value: `${computedSuccessRate}%`,
                sub: weeklyChange >= 0 ? `+${weeklyChange}% this week` : `${weeklyChange}% this week`,
                icon: weeklyChange >= 0 ? TrendingUp : TrendingDown,
                color: computedSuccessRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500",
                iconColor: weeklyChange >= 0 ? "text-emerald-500" : "text-red-400",
              },
              {
                label: "Avg Backup Size",
                value: avgSize > 0 ? formatBytes(avgSize) : "—",
                sub: `${totalSuccessful} backups`,
                icon: Database,
                color: "text-foreground",
                iconColor: "text-muted-foreground",
              },
              {
                label: "Weekly Δ",
                value: `${weeklyChange > 0 ? "+" : ""}${weeklyChange}%`,
                sub: "volume trend",
                icon: weeklyChange >= 0 ? TrendingUp : TrendingDown,
                color: weeklyChange >= 0 ? "text-foreground" : "text-muted-foreground",
                iconColor: weeklyChange >= 0 ? "text-emerald-500" : "text-muted-foreground",
              },
            ].map(({ label, value, sub, icon: Icon, color, iconColor }) => (
              <div key={label} className="rounded-xl border border-muted/30 bg-muted/10 p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</p>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-2xl font-bold tracking-tight leading-none", color)}>{value}</span>
                  <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
                </div>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {/* Stacked bar chart */}
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No activity in the last 7 days</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {timeline.slice(-7).map((item, index) => {
                const successW = (item.successful / maxTotal) * 100;
                const failedW = (item.failed / maxTotal) * 100;
                const runningW = ((item.running || 0) / maxTotal) * 100;
                const date = new Date(item.date);
                const label = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-[5.5rem] text-[11px] text-muted-foreground text-right shrink-0 font-medium tabular-nums">
                      {label}
                    </div>
                    <div className="flex-1 relative">
                      <div className="flex gap-px h-6 rounded-md overflow-hidden bg-muted/20">
                        {item.successful > 0 && (
                          <div
                            className="bg-emerald-500 flex items-center justify-center text-[9px] text-white font-bold transition-all duration-300 hover:brightness-110"
                            style={{ width: `${Math.max(successW, 4)}%` }}
                            title={`${item.successful} successful`}
                          >
                            {successW > 15 ? item.successful : ""}
                          </div>
                        )}
                        {(item.running || 0) > 0 && (
                          <div
                            className="bg-blue-400 flex items-center justify-center text-[9px] text-white font-bold transition-all"
                            style={{ width: `${Math.max(runningW, 3)}%` }}
                            title={`${item.running} running`}
                          />
                        )}
                        {item.failed > 0 && (
                          <div
                            className="bg-red-500 flex items-center justify-center text-[9px] text-white font-bold transition-all hover:brightness-110"
                            style={{ width: `${Math.max(failedW, 4)}%` }}
                            title={`${item.failed} failed`}
                          >
                            {failedW > 15 ? item.failed : ""}
                          </div>
                        )}
                        {item.successful === 0 && item.failed === 0 && !(item.running > 0) && (
                          <div className="flex-1 flex items-center justify-center">
                            <span className="text-[9px] text-muted-foreground/50">—</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-8 text-right text-[11px] font-semibold text-foreground shrink-0 tabular-nums">
                      {item.total}
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex items-center gap-4 pt-1">
                {[
                  { color: "bg-emerald-500", label: "Successful" },
                  { color: "bg-blue-400", label: "Running" },
                  { color: "bg-red-500", label: "Failed" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-sm", color)} />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom insight strip */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-muted/20">
            {[
              { icon: ShieldCheck, text: failureProbability, color: computedSuccessRate >= 97 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500" },
              { icon: TrendingUp, text: growthInsight, color: "text-muted-foreground" },
              { icon: Cpu, text: systemInsight, color: computedSuccessRate >= 95 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500" },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-start gap-1.5 p-2 rounded-lg bg-muted/10">
                <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", color)} />
                <span className={cn("text-[10px] font-medium leading-tight", color)}>{text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          RIGHT COLUMN — Health + Retention stacked
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">

        {/* ── PANEL 2 — Infrastructure Health ────────────────────────────── */}
        <Card className="bg-gradient-to-br from-white/90 to-slate-50/60 dark:from-zinc-900/80 dark:to-zinc-950/50 backdrop-blur-sm rounded-2xl border border-muted/40 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-400/20">
                  <Activity className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Infrastructure Health</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Real-time system reliability</CardDescription>
                </div>
              </div>
              <SystemBadge label="System Generated" />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!health ? (
              <div className="text-sm text-muted-foreground text-center py-8">Health data unavailable</div>
            ) : (
              <>
                {/* Health score + uptime row */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/10 border border-muted/20">
                  <HealthRing score={health.healthScore || 90} />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Uptime</p>
                      <p className="text-xl font-bold text-foreground tracking-tight">{health.uptime || 99.9}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                        {health.status === "healthy" ? "All Systems Nominal" : "Degraded"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-1.5">
                  {Object.entries(health.checks || {}).map(([key, check]) => {
                    const icons = { database: Server, storage: HardDrive, queue: Layers };
                    const Icon = icons[key] || Activity;
                    const ok = check.status === "up" || check.status === "healthy";

                    let detail = "—";
                    if (key === "database" && check.latencyMs !== undefined) {
                      detail = check.latencyMs < 100 ? `${check.latencyMs}ms latency` : "high latency";
                    } else if (key === "storage" && check.capacityPct !== undefined) {
                      detail = `${check.capacityPct}% capacity`;
                    } else if (key === "queue") {
                      detail = `${check.activeJobs ?? 0} active jobs`;
                    }

                    return (
                      <div key={key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/10 border border-muted/20 hover:bg-muted/20 transition-colors">
                        <StatusDot status={check.status} />
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground capitalize flex-1 truncate">{key}</span>
                        <span className="text-[10px] text-muted-foreground">{detail}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 h-4 shrink-0",
                            ok
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-red-400/30 bg-red-500/10 text-red-500"
                          )}
                        >
                          {check.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                {/* Job counters */}
                {health.checks?.queue && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-muted/20">
                    {[
                      { label: "Active", value: health.checks.queue.activeJobs ?? 0, icon: Zap, color: "text-blue-500" },
                      { label: "Queued", value: health.checks.queue.pendingJobs ?? 0, icon: Clock, color: "text-muted-foreground" },
                      { label: "Failed", value: health.checks.queue.failedJobs ?? 0, icon: AlertTriangle, color: (health.checks.queue.failedJobs ?? 0) > 0 ? "text-red-500" : "text-muted-foreground" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-muted/10">
                        <Icon className={cn("h-3.5 w-3.5", color)} />
                        <span className={cn("text-base font-bold leading-none tabular-nums", color)}>{value}</span>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── PANEL 3 — Retention Risk Intelligence ──────────────────────── */}
        <Card className="bg-gradient-to-br from-white/90 to-slate-50/60 dark:from-zinc-900/80 dark:to-zinc-950/50 backdrop-blur-sm rounded-2xl border border-muted/40 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/20">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Retention Risk</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Storage lifecycle intelligence</CardDescription>
                </div>
              </div>
              <SystemBadge label="Trend Analysis" />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* Risk counters */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "Exp. in 7d",
                  value: exp7,
                  color: exp7 > 0 ? "text-red-500" : "text-foreground",
                  bg: exp7 > 0 ? "bg-red-500/8 border-red-400/20" : "bg-muted/10 border-muted/20",
                },
                {
                  label: "Exp. in 30d",
                  value: exp30,
                  color: exp30 > 0 ? "text-amber-500" : "text-foreground",
                  bg: exp30 > 0 ? "bg-amber-500/8 border-amber-400/20" : "bg-muted/10 border-muted/20",
                },
                {
                  label: "Expired",
                  value: expExpired,
                  color: expExpired > 0 ? "text-red-600 dark:text-red-400" : "text-foreground",
                  bg: expExpired > 0 ? "bg-red-500/8 border-red-400/20" : "bg-muted/10 border-muted/20",
                },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={cn("flex flex-col items-center gap-0.5 p-2.5 rounded-xl border", bg)}>
                  <span className={cn("text-2xl font-bold tracking-tight tabular-nums leading-none", color)}>{value}</span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground text-center leading-tight mt-0.5">{label}</span>
                </div>
              ))}
            </div>

            {/* Visual risk bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Lifecycle Risk Spectrum</p>
                <span className={cn("text-[10px] font-semibold", retentionHealthy ? "text-emerald-500" : "text-amber-500")}>
                  {retentionHealthy ? "Healthy" : "Action needed"}
                </span>
              </div>
              <RiskBar
                pct7={totalR > 0 ? Math.round((exp7 / Math.max(totalR, 1)) * 100) : 0}
                pct30={totalR > 0 ? Math.round((exp30 / Math.max(totalR, 1)) * 100) : 0}
                pctExpired={totalR > 0 ? Math.round((expExpired / Math.max(totalR, 1)) * 100) : 0}
              />
              <div className="flex gap-4">
                {[
                  { color: "bg-red-500", label: "Expired" },
                  { color: "bg-amber-400", label: "7d" },
                  { color: "bg-emerald-500", label: "30d" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={cn("h-1.5 w-1.5 rounded-sm", color)} />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage retained */}
            {retention?.totalRetainedSizeGB !== undefined && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/10 border border-muted/20">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total Retained</span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {retention.totalRetainedSizeGB} GB
                </span>
              </div>
            )}

            {/* Footer insight */}
            <div className={cn(
              "flex items-start gap-2 p-2.5 rounded-xl border text-[11px] font-medium",
              retentionHealthy
                ? "bg-emerald-500/8 border-emerald-400/20 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/8 border-amber-400/20 text-amber-700 dark:text-amber-400"
            )}>
              {retentionHealthy
                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              }
              <span>
                {retentionHealthy
                  ? "Retention healthy — no immediate action required"
                  : "Storage optimization recommended"
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
