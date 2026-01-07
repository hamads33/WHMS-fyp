"use client";

import { Users, Globe, Server, DollarSign, Ticket, Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AuditActivityFeed } from "@/components/admin/AuditActivityFeed";
export default function DashboardPage() {
  // 🔹 Generic placeholder state
  const stats = {
    totalClients: "—",
    activeServers: "—",
    totalDomains: "—",
    monthlyRevenue: "—",
    ticketsOpen: "—",
    serverUptime: "—",
  };
  const metrics = []; // empty chart
  const activity = []; // empty activity

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here&apos;s your system overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Clients" value={stats.totalClients} icon={Users} />
        <StatCard title="Active Servers" value={stats.activeServers} icon={Server} />
        <StatCard title="Total Domains" value={stats.totalDomains} icon={Globe} />
        <StatCard title="Monthly Revenue" value={stats.monthlyRevenue} icon={DollarSign} />
        <StatCard title="Open Tickets" value={stats.ticketsOpen} icon={Ticket} />
        <StatCard title="Server Uptime" value={stats.serverUptime} icon={Activity} />
      </div>

      {/* Charts + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Server Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Server Performance</CardTitle>
            <CardDescription>
              CPU and memory metrics (data source not connected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              No metrics available
            </div>
          </CardContent>
        </Card>

   {/* Recent Activity (Audit Logs) */}
<Card>
  <CardHeader>
    <CardTitle>Recent Activity</CardTitle>
    <CardDescription>
      Latest system-wide audit events (read-only)
    </CardDescription>
  </CardHeader>

  <CardContent>
    <AuditActivityFeed />
  </CardContent>
</Card>


      </div>
    </div>
  );
}
