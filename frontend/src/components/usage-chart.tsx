"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { name: "Jan", bandwidth: 4000, storage: 2400 },
  { name: "Feb", bandwidth: 3000, storage: 2210 },
  { name: "Mar", bandwidth: 2000, storage: 2290 },
  { name: "Apr", bandwidth: 2780, storage: 2000 },
  { name: "May", bandwidth: 1890, storage: 2181 },
  { name: "Jun", bandwidth: 2390, storage: 2500 },
  { name: "Jul", bandwidth: 3490, storage: 2100 },
]

export function UsageChart() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Resource Usage</CardTitle>
          <CardDescription>Bandwidth and storage consumption over time</CardDescription>
        </div>
        <Select defaultValue="7d">
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorBandwidth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="name"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
              />
              <Area
                type="monotone"
                dataKey="bandwidth"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorBandwidth)"
              />
              <Area
                type="monotone"
                dataKey="storage"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fill="url(#colorStorage)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Bandwidth (GB)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            <span className="text-sm text-muted-foreground">Storage (GB)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
