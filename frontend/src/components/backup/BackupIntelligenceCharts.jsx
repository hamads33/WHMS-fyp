"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, Minus, ShieldCheck, AlertTriangle, Activity } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, AreaChart, Area, CartesianGrid,
} from "recharts";

const PERIODS = [
  { label: "7D",  value: "7d"  },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

function MetricTile({ label, value, sub, trend, trendVal }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-secondary border border-border">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
      <div className="flex items-end gap-1.5">
        <span className="text-xl font-bold tracking-tight text-foreground leading-none">{value}</span>
        {trendVal !== undefined && (
          <span className={cn(
            "flex items-center gap-0.5 text-[11px] font-semibold mb-0.5",
            trend === "up" ? "text-foreground" : trend === "down" ? "text-destructive" : "text-muted-foreground"
          )}>
            <TrendIcon className="h-3 w-3" />{trendVal}
          </span>
        )}
      </div>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-popover-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold text-popover-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const CustomAreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-popover-foreground mb-1">{label ? new Date(label).toLocaleDateString() : ""}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.stroke }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-popover-foreground">{p.value} GB</span>
        </div>
      ))}
    </div>
  );
};

export function BackupIntelligenceCharts() {
  const [period, setPeriod]           = useState("30d");
  const [timeline, setTimeline]       = useState([]);
  const [storage, setStorage]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeChart, setActiveChart] = useState("activity");

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      backupApi(`/analytics/timeline?period=${period}`),
      backupApi("/analytics/storage-usage"),
    ]).then(([tRes, sRes]) => {
      if (tRes.status === "fulfilled") setTimeline(tRes.value.data?.timeline || []);
      if (sRes.status === "fulfilled") {
        const raw  = sRes.value.data || [];
        const step = Math.max(1, Math.floor(raw.length / 30));
        setStorage(raw.filter((_, i) => i % step === 0).slice(-30));
      }
    }).finally(() => setLoading(false));
  }, [period]);

  const totalSuccessful = timeline.reduce((s, d) => s + (d.successful || 0), 0);
  const totalFailed     = timeline.reduce((s, d) => s + (d.failed    || 0), 0);
  const totalRunning    = timeline.reduce((s, d) => s + (d.running   || 0), 0);
  const successRate     = totalSuccessful + totalFailed > 0
    ? Math.round((totalSuccessful / (totalSuccessful + totalFailed)) * 100) : 0;
  const weeklyChange    = timeline.length >= 2
    ? Math.round(((timeline[timeline.length - 1].total - timeline[0].total) / Math.max(timeline[0].total, 1)) * 100) : 0;

  const insights = [
    {
      icon:  successRate >= 95 ? ShieldCheck : AlertTriangle,
      ok:    successRate >= 95,
      text:  successRate >= 95 ? "System reliability stable" : `Success rate degraded (${successRate}%)`,
    },
    {
      icon:  weeklyChange <= 15 ? Activity : TrendingUp,
      ok:    weeklyChange <= 15,
      text:  weeklyChange <= 15 ? "Storage growth within expected range" : "Storage growth accelerating",
    },
    {
      icon:  totalFailed === 0 ? ShieldCheck : AlertTriangle,
      ok:    totalFailed === 0,
      text:  totalFailed === 0 ? "No anomaly detected" : `${totalFailed} failure${totalFailed > 1 ? "s" : ""} detected`,
    },
  ];

  const chartData = timeline.slice(-14).map((d) => ({
    date:       new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    Successful: d.successful || 0,
    Failed:     d.failed     || 0,
    Running:    d.running    || 0,
  }));

  const storageData = storage.map((d) => ({
    date:          d.date ? new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
    "Cumulative GB": d.cumulativeGB || 0,
  }));

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary border border-border">
              <BarChart3 className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Backup Intelligence Matrix</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Performance trends & storage growth</p>
            </div>
          </div>
          {/* Period switcher */}
          <div className="flex items-center rounded-lg border border-border bg-secondary p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all",
                  period === p.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <MetricTile label="Success Rate"  value={`${successRate}%`} trendVal={`${weeklyChange > 0 ? "+" : ""}${weeklyChange}%`} trend={weeklyChange >= 0 ? "up" : "down"} sub="period avg" />
          <MetricTile label="Successful"    value={totalSuccessful.toLocaleString()} sub={`${period} period`} />
          <MetricTile label="Failed"        value={totalFailed.toLocaleString()}     sub="needs review" trend={totalFailed > 0 ? "down" : undefined} />
          <MetricTile label="In Progress"   value={totalRunning.toLocaleString()}    sub="running now" />
        </div>

        {/* Chart tab switcher */}
        <div className="flex gap-1 mt-3">
          {[
            { key: "activity", label: "Activity" },
            { key: "storage",  label: "Storage Growth" },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveChart(c.key)}
              className={cn(
                "px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                activeChart === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        {loading ? (
          <div className="flex-1 bg-muted/30 rounded-xl animate-pulse min-h-[180px]" />
        ) : (
          <div className="flex-1 min-h-[180px]">
            {activeChart === "activity" ? (
              chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No activity data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={13} barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="Successful" stackId="a" fill="var(--color-chart-2)" radius={[0,0,0,0]} />
                    <Bar dataKey="Running"    stackId="a" fill="var(--color-chart-3)" radius={[0,0,0,0]} />
                    <Bar dataKey="Failed"     stackId="a" fill="hsl(var(--destructive))" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : (
              storageData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No storage data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={storageData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area type="monotone" dataKey="Cumulative GB" stroke="hsl(var(--foreground))" strokeWidth={2} fill="url(#storageGrad)" dot={false} activeDot={{ r: 4, fill: "hsl(var(--foreground))" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        )}

        {/* Insight strip */}
        <div className="grid grid-cols-3 gap-2 flex-none">
          {insights.map(({ icon: Icon, ok, text }) => (
            <div key={text} className={cn(
              "flex items-start gap-2 p-2.5 rounded-xl border text-[10px] font-semibold leading-tight",
              ok
                ? "bg-secondary border-border text-foreground"
                : "bg-destructive/8 border-destructive/20 text-destructive"
            )}>
              <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
