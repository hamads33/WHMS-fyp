"use client";

import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

function ScoreRing({ value }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="hsl(var(--foreground))" strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-foreground tabular-nums">{value}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

function MiniRing({ value, label }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center">
        <svg width="52" height="52" className="-rotate-90">
          <circle cx="26" cy="26" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
          <circle cx="26" cy="26" r={r} fill="none" stroke="hsl(var(--foreground))" strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <span className="absolute text-[11px] font-bold text-foreground tabular-nums">{value}%</span>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function MetricBar({ label, success, failed, total }) {
  const rate = total > 0 ? Math.round((success / total) * 100) : 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-foreground">{rate}%</span>
      </div>
      <Progress value={rate} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">{success} ok · {failed} failed · {total} total</p>
    </div>
  );
}

export function AutomationHealthWidget({ health, loading }) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const overallScore = health?.overallScore ?? 100;
  const cronRate     = health?.cronRate     ?? 100;
  const wfRate       = health?.wfRate       ?? 100;
  const provRate     = health?.provRate     ?? 100;
  const t            = health?.totals       ?? {};
  const scoreLabel   = overallScore >= 90 ? "Excellent" : overallScore >= 70 ? "Good" : "Needs Attention";

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Automation Health</CardTitle>
            <CardDescription className="text-xs mt-0.5">Last 30 days</CardDescription>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Zap className="h-4 w-4 text-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          <ScoreRing value={overallScore} />
          <span className="text-xs font-medium text-muted-foreground">{scoreLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniRing value={cronRate}  label="Cron" />
          <MiniRing value={wfRate}    label="Workflows" />
          <MiniRing value={provRate}  label="Prov." />
        </div>
        <Separator />
        <div className="flex flex-col gap-4 flex-1">
          <MetricBar label="Cron Jobs"    success={t.successCron ?? 0} failed={t.failedCron ?? 0} total={t.cron ?? 0} />
          <MetricBar label="Workflows"    success={t.successWf   ?? 0} failed={t.failedWf   ?? 0} total={t.wf   ?? 0} />
          <MetricBar label="Provisioning" success={t.successProv ?? 0} failed={t.failedProv ?? 0} total={t.prov ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}
