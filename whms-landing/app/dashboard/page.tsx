"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { ArrowUpRight, Users, Zap, TrendingUp } from "lucide-react"

const chartData = [
  { name: "Jan", value: 400, users: 240 },
  { name: "Feb", value: 300, users: 221 },
  { name: "Mar", value: 200, users: 229 },
  { name: "Apr", value: 278, users: 200 },
  { name: "May", value: 189, users: 218 },
  { name: "Jun", value: 239, users: 250 },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Welcome back! Here's your project overview.</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">New Project</Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          {[
            { label: "Total Projects", value: "12", icon: Zap, change: "+2.5%" },
            { label: "Active Users", value: "2,543", icon: Users, change: "+12.1%" },
            { label: "Revenue", value: "$45,231", icon: TrendingUp, change: "+8.2%" },
            { label: "Deployments", value: "1,234", icon: ArrowUpRight, change: "+4.3%" },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <Card key={i} className="border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-2 text-xs text-primary">{stat.change}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card p-6">
            <h3 className="mb-6 text-lg font-semibold text-foreground">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="border-border bg-card p-6">
            <h3 className="mb-6 text-lg font-semibold text-foreground">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="users" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-border bg-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-foreground">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: "Deployed new version", project: "BuildHub Pro", time: "2 hours ago" },
              { action: "Added team member", project: "Marketing Site", time: "5 hours ago" },
              { action: "Updated environment variables", project: "API Server", time: "1 day ago" },
              { action: "Created new project", project: "Mobile App", time: "2 days ago" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border pb-4 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.project}</p>
                </div>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
