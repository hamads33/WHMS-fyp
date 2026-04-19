"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { HardDrive, TrendingUp, TrendingDown, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function BackupTrendWidget({ data = [], loading }) {
  const chartData    = data.slice(-14);
  const totalSuccess = data.reduce((s, d) => s + (d.success ?? 0), 0);
  const totalFailed  = data.reduce((s, d) => s + (d.failed  ?? 0), 0);
  const total        = totalSuccess + totalFailed;
  const successRate  = total > 0 ? Math.round((totalSuccess / total) * 100) : 100;

  // Week over week change
  const firstHalf  = data.slice(0, Math.floor(data.length / 2)).reduce((s, d) => s + (d.success ?? 0), 0);
  const secondHalf = data.slice(Math.floor(data.length / 2)).reduce((s, d) => s + (d.success ?? 0), 0);
  const weekChange = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

  const isGood = successRate >= 90;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-md" />)}
          </div>
          <Skeleton className="h-36 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Backup Reliability
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold",
                  isGood
                    ? "bg-accent/10 text-accent-foreground border-accent/20"
                    : "bg-destructive/10 text-destructive border-destructive/30"
                )}
              >
                {successRate}% rate
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Last 30 days · daily breakdown</CardDescription>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <HardDrive className="h-4 w-4 text-foreground" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Stat row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/40 py-3 gap-1">
            <span className="text-xl font-bold text-foreground tabular-nums">{successRate}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rate</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/40 py-3 gap-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-foreground shrink-0" />
              <span className="text-xl font-bold text-foreground tabular-nums">{totalSuccess}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Success</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/40 py-3 gap-1">
            <div className="flex items-center gap-1">
              {totalFailed > 0 && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              <span className={cn("text-xl font-bold tabular-nums", totalFailed > 0 ? "text-destructive" : "text-foreground")}>{totalFailed}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</span>
          </div>
        </div>

        {/* Trend label */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">14-day trend</span>
          <span className={cn("text-xs font-semibold flex items-center gap-1", weekChange >= 0 ? "text-foreground" : "text-destructive")}>
            {weekChange >= 0
              ? <TrendingUp className="h-3.5 w-3.5" />
              : <TrendingDown className="h-3.5 w-3.5" />
            }
            {Math.abs(weekChange)}% vs prior period
          </span>
        </div>

        {/* Chart */}
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No backup data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chartData} margin={{ top: 2, right: 0, left: -22, bottom: 0 }} barSize={6} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false} axisLine={false} interval={3}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false} axisLine={false} allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
              <Bar dataKey="success" name="Success" stackId="a" fill="hsl(var(--foreground))" isAnimationActive={false} />
              <Bar dataKey="failed"  name="Failed"  stackId="a" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 justify-center">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-foreground" /> Successful
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-destructive" /> Failed
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
