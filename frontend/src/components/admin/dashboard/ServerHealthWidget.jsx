"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Server, Wifi, HardDrive, Cpu, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const HEALTH_CONFIG = {
  healthy:  { color: "hsl(var(--foreground))",       label: "Healthy",  dot: "bg-foreground",        badge: "bg-accent/10 text-accent-foreground border-accent/20" },
  warning:  { color: "hsl(var(--muted-foreground))", label: "Warning",  dot: "bg-muted-foreground",  badge: "bg-muted text-foreground border-border" },
  critical: { color: "hsl(var(--destructive))",      label: "Critical", dot: "bg-destructive",       badge: "bg-destructive/10 text-destructive border-destructive/30" },
};

function StatusDot({ status }) {
  const cfg = HEALTH_CONFIG[status] ?? HEALTH_CONFIG.healthy;
  return (
    <span className={cn(
      "h-2 w-2 rounded-full shrink-0 inline-block",
      cfg.dot,
      status === "healthy" ? "animate-pulse" : ""
    )} />
  );
}

function MetricMini({ icon: Icon, value, label, warn }) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-md bg-muted/40 flex-1">
      <Icon className={cn("h-3 w-3 mb-0.5", warn ? "text-destructive" : "text-muted-foreground")} />
      <span className={cn("text-[11px] font-bold tabular-nums", warn ? "text-destructive" : "text-foreground")}>{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function ServerRow({ server }) {
  const h = HEALTH_CONFIG[server.health] ?? HEALTH_CONFIG.healthy;
  const cpu  = server.cpuUsage  ?? 0;
  const ram  = server.ramUsage  ?? 0;
  const disk = server.diskUsage ?? 0;

  return (
    <div className="py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={server.health} />
          <span className="text-sm font-medium text-foreground truncate">{server.name}</span>
          {server.type && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 hidden sm:inline">
              {server.type}
            </span>
          )}
        </div>
        <Badge variant="outline" className={cn("text-[10px] shrink-0 font-medium", h.badge)}>
          {h.label}
        </Badge>
      </div>

      {/* 3 mini metric bars */}
      <div className="grid grid-cols-3 gap-1.5 pl-4">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1"><Cpu className="h-2.5 w-2.5" />CPU</span>
            <span className={cn("font-semibold tabular-nums", cpu > 85 ? "text-destructive" : "text-foreground")}>{Math.round(cpu)}%</span>
          </div>
          <Progress value={cpu} className={cn("h-1", cpu > 85 ? "[&>div]:bg-destructive" : "")} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1"><Activity className="h-2.5 w-2.5" />RAM</span>
            <span className={cn("font-semibold tabular-nums", ram > 85 ? "text-destructive" : "text-foreground")}>{Math.round(ram)}%</span>
          </div>
          <Progress value={ram} className={cn("h-1", ram > 85 ? "[&>div]:bg-destructive" : "")} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1"><HardDrive className="h-2.5 w-2.5" />Disk</span>
            <span className={cn("font-semibold tabular-nums", disk > 90 ? "text-destructive" : "text-foreground")}>{Math.round(disk)}%</span>
          </div>
          <Progress value={disk} className={cn("h-1", disk > 90 ? "[&>div]:bg-destructive" : "")} />
        </div>
      </div>

      {server.accountCount !== undefined && (
        <div className="flex items-center gap-1 pl-4">
          <Wifi className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{server.accountCount} accounts</span>
          {server.latency !== undefined && (
            <span className="text-[10px] text-muted-foreground ml-2">· {server.latency}ms</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ServerHealthWidget({ servers = [], serverHealth, loading }) {
  const total      = serverHealth?.total    ?? 0;
  const healthy    = serverHealth?.healthy  ?? 0;
  const warning    = serverHealth?.warning  ?? 0;
  const critical   = serverHealth?.critical ?? 0;
  const healthyPct = total > 0 ? Math.round((healthy / total) * 100) : 100;

  const pieData = [
    { name: "Healthy",  value: healthy,  color: "hsl(var(--foreground))" },
    { name: "Warning",  value: warning,  color: "hsl(var(--muted-foreground))" },
    { name: "Critical", value: critical, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  const displayPieData = pieData.length > 0
    ? pieData
    : [{ name: "Healthy", value: 1, color: "hsl(var(--foreground))" }];

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
          </div>
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Server Health
              {critical > 0 && (
                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 animate-pulse">
                  {critical} Critical
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">{total} servers monitored</CardDescription>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Server className="h-4 w-4 text-foreground" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1 flex flex-col gap-4">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Server className="h-8 w-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No servers configured</p>
          </div>
        ) : (
          <>
            {/* Donut + legend row */}
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayPieData}
                      cx="50%" cy="50%"
                      innerRadius={34} outerRadius={50}
                      paddingAngle={3} dataKey="value"
                      isAnimationActive={false}
                    >
                      {displayPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [v, n]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-bold text-foreground">{healthyPct}%</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Healthy</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 space-y-2.5">
                {[
                  { key: "healthy",  label: "Healthy",  value: healthy,  cfg: HEALTH_CONFIG.healthy  },
                  { key: "warning",  label: "Warning",  value: warning,  cfg: HEALTH_CONFIG.warning  },
                  { key: "critical", label: "Critical", value: critical, cfg: HEALTH_CONFIG.critical },
                ].map(({ key, label, value, cfg }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                    <span className="text-xs text-muted-foreground flex-1">{label}</span>
                    <span className="text-sm font-bold text-foreground tabular-nums w-6 text-right">{value}</span>
                    <Progress
                      value={total > 0 ? (value / total) * 100 : 0}
                      className="h-1.5 w-16"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Server list */}
            <div className="divide-y divide-border/50 -my-1">
              {servers.slice(0, 4).map((s) => (
                <ServerRow key={s.id} server={s} />
              ))}
              {servers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No server metrics available</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
