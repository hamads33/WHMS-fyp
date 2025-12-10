"use client"

import { Users, Globe, Server, DollarSign, Ticket, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { dashboardStats, recentActivity, serverMetrics } from "../../lib/mock-data"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Admin. Here&apos;s your system overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Clients"
          value={dashboardStats.totalClients.toLocaleString()}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Active Servers"
          value={dashboardStats.activeServers}
          change="3 need attention"
          changeType="negative"
          icon={Server}
        />
        <StatCard
          title="Total Domains"
          value={dashboardStats.totalDomains.toLocaleString()}
          change="+8% from last month"
          changeType="positive"
          icon={Globe}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${dashboardStats.monthlyRevenue.toLocaleString()}`}
          change="+15% from last month"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Open Tickets"
          value={dashboardStats.ticketsOpen}
          change="5 urgent"
          changeType="negative"
          icon={Ticket}
        />
        <StatCard
          title="Server Uptime"
          value={`${dashboardStats.serverUptime}%`}
          change="Last 30 days"
          changeType="positive"
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Server Performance</CardTitle>
            <CardDescription>CPU, Memory, and Request metrics over 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serverMetrics}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#2dd4bf"
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                    name="CPU %"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    stroke="#818cf8"
                    fillOpacity={1}
                    fill="url(#colorMemory)"
                    name="Memory %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Recent Activity</CardTitle>
            <CardDescription>Latest events across your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-card-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
