import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Globe, LifeBuoy, CreditCard, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const actions = [
  {
    title: "New Service",
    description: "Order hosting plan",
    icon: Plus,
    href: "/dashboard/services/order",
    primary: true,
  },
  {
    title: "Register Domain",
    description: "Search domains",
    icon: Globe,
    href: "/dashboard/domains/register",
  },
  {
    title: "Open Ticket",
    description: "Get support",
    icon: LifeBuoy,
    href: "/dashboard/support/new",
  },
  {
    title: "Add Funds",
    description: "Top up account",
    icon: CreditCard,
    href: "/dashboard/billing/add-funds",
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className={cn(
              "flex items-center gap-4 p-3 rounded-lg transition-all duration-150 group",
              action.primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                action.primary ? "bg-primary-foreground/20" : "bg-primary/10",
              )}
            >
              <action.icon className={cn("h-5 w-5", action.primary ? "text-primary-foreground" : "text-primary")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", !action.primary && "text-foreground")}>{action.title}</p>
              <p className={cn("text-xs", action.primary ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {action.description}
              </p>
            </div>
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform group-hover:translate-x-0.5",
                action.primary ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
