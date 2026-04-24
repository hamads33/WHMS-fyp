"use client"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowDown, ArrowUp } from "lucide-react"

/**
 * StatsCard Component
 * Integrated with Auth Module metrics.
 */
export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  className 
}) {
  return (
    <Card className={cn("group transition-all duration-200 hover:shadow-md hover:border-primary/20", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                trend.isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive",
              )}
            >
              {trend.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {trend.value}%
            </div>
          )}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {/* Logic: Handle loading states or formatted backend values */}
            {value ?? "—"}
          </p>
          <p className="text-sm font-medium text-foreground/80">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}