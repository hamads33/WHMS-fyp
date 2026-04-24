"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ClientGrowthChart({ data = [], loading }) {
  const totalNew    = data.reduce((s, d) => s + (d.new ?? 0), 0);
  const latestTotal = data[data.length - 1]?.total ?? 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="text-xs font-medium uppercase tracking-widest mb-0.5">Client Growth</CardDescription>
            {loading ? <Skeleton className="h-7 w-20 mt-1" /> : (
              <CardTitle className="text-2xl font-bold text-foreground">+{totalNew.toLocaleString()}</CardTitle>
            )}
            <CardDescription className="text-xs mt-1">New clients over last 12 months · {latestTotal.toLocaleString()} total</CardDescription>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Users className="h-4 w-4 text-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <Skeleton className="h-36 w-full rounded-lg" />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-36 text-sm text-muted-foreground">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cTotalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--foreground))" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cNewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--muted-foreground))" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="total" name="Total" stroke="hsl(var(--foreground))"       strokeWidth={2}   fill="url(#cTotalGrad)" dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="new"   name="New"   stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="url(#cNewGrad)"   dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
