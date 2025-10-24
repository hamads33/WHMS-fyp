"use client"

import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const previewData = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 200 },
  { name: "Apr", value: 278 },
  { name: "May", value: 189 },
  { name: "Jun", value: 239 },
]

export function DashboardPreview() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-foreground">Powerful Dashboard</h2>
          <p className="text-lg text-muted-foreground">
            Monitor your projects, track metrics, and manage your team all in one place
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
          {/* Dashboard Header */}
          <div className="mb-8 flex items-center justify-between border-b border-border pb-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Your Projects</h3>
              <p className="text-sm text-muted-foreground">Real-time analytics and insights</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">View Full Dashboard</Button>
          </div>

          {/* Stats Preview */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[
              { label: "Active Projects", value: "12" },
              { label: "Team Members", value: "8" },
              { label: "Deployments", value: "234" },
            ].map((stat, i) => (
              <div key={i} className="rounded-lg bg-background p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Chart Preview */}
          <div className="rounded-lg bg-background p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Performance Metrics</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={previewData}>
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
                <Bar dataKey="value" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}
