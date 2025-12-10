import { Server, Globe, CreditCard, Wallet, TrendingUp } from "lucide-react"
import { StatsCard } from "@/components/stats-card"
import { UsageChart } from "@/components/usage-chart"
import { QuickActions } from "@/components/quick-actions"
import { RecentActivity } from "@/components/recent-activity"
import { Announcements } from "@/components/announcements"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back, John</h1>
            <Badge variant="secondary" className="text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5"></span>
              All systems operational
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Here&apos;s what&apos;s happening with your account today</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-success" />
          <span>
            Account health: <span className="text-success font-medium">Excellent</span>
          </span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Services"
          value="5"
          description="2 VPS, 2 Shared, 1 Dedicated"
          icon={Server}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Domains"
          value="8"
          description="3 expiring soon"
          icon={Globe}
          trend={{ value: 2, isPositive: true }}
        />
        <StatsCard
          title="Outstanding"
          value="$124.99"
          description="2 invoices due"
          icon={CreditCard}
          trend={{ value: 8, isPositive: false }}
        />
        <StatsCard title="Credit Balance" value="$250.00" description="Available balance" icon={Wallet} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UsageChart />
        </div>
        <QuickActions />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity />
        <Announcements />
      </div>
    </div>
  )
}
