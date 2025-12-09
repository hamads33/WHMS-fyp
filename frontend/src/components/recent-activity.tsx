import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Server, Globe, CreditCard, LifeBuoy, ChevronRight } from "lucide-react"
import Link from "next/link"

const activities = [
  {
    id: 1,
    type: "service",
    title: "VPS Server Renewed",
    description: "Your VPS hosting has been renewed for another month",
    time: "2 hours ago",
    icon: Server,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    id: 2,
    type: "domain",
    title: "Domain Registered",
    description: "newsite.com has been registered successfully",
    time: "5 hours ago",
    icon: Globe,
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    id: 3,
    type: "billing",
    title: "Payment Received",
    description: "Payment of $49.99 has been processed",
    time: "1 day ago",
    icon: CreditCard,
    color: "bg-violet-500/10 text-violet-500",
  },
  {
    id: 4,
    type: "support",
    title: "Ticket Resolved",
    description: "Support ticket #4521 has been resolved",
    time: "2 days ago",
    icon: LifeBuoy,
    color: "bg-amber-500/10 text-amber-500",
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          <CardDescription>Your latest account activity</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
          <Link href="/dashboard/activity">
            View all
            <ChevronRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex items-start gap-4 group">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${activity.color}`}>
                <activity.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{activity.description}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 pt-0.5">{activity.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
