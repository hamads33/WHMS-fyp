import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Megaphone, ChevronRight, AlertTriangle, Sparkles, Tag } from "lucide-react"
import Link from "next/link"

const announcements = [
  {
    id: 1,
    title: "Scheduled Maintenance",
    content: "We will be performing scheduled maintenance on Dec 15, 2025 from 2:00 AM to 4:00 AM UTC.",
    date: "Dec 7, 2025",
    type: "maintenance",
    icon: AlertTriangle,
  },
  {
    id: 2,
    title: "New Data Center in Singapore",
    content: "We are excited to announce our new data center in Singapore for improved latency in Asia.",
    date: "Dec 5, 2025",
    type: "news",
    icon: Sparkles,
  },
  {
    id: 3,
    title: "Holiday Promotion",
    content: "Get 25% off on all annual plans this holiday season. Use code HOLIDAY25.",
    date: "Dec 1, 2025",
    type: "promotion",
    icon: Tag,
  },
]

const typeStyles = {
  maintenance: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: "text-amber-500",
  },
  news: {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: "text-blue-500",
  },
  promotion: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: "text-emerald-500",
  },
}

export function Announcements() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold">Announcements</CardTitle>
            <CardDescription className="text-xs">Latest updates and news</CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
          <Link href="/dashboard/announcements">
            View all
            <ChevronRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const styles = typeStyles[announcement.type as keyof typeof typeStyles]
            return (
              <div key={announcement.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`text-[10px] font-medium capitalize ${styles.badge}`}>
                    <announcement.icon className={`w-3 h-3 mr-1 ${styles.icon}`} />
                    {announcement.type}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{announcement.date}</span>
                </div>
                <h4 className="text-sm font-medium text-foreground">{announcement.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {announcement.content}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
