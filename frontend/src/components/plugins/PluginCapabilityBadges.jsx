import { cn } from "@/lib/utils"
import {
  Webhook, LayoutDashboard, Clock, Zap, DollarSign, Server, Globe, Code2,
} from "lucide-react"

const CAPABILITY_META = {
  hooks:        { label: "Hooks",        icon: Webhook,         color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  api:          { label: "API",          icon: Code2,           color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  ui:           { label: "UI",           icon: LayoutDashboard, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  cron:         { label: "Cron",         icon: Clock,           color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  billing:      { label: "Billing",      icon: DollarSign,      color: "text-green-500 bg-green-500/10 border-green-500/20" },
  provisioning: { label: "Provisioning", icon: Server,          color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  automation:   { label: "Automation",   icon: Zap,             color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  domains:      { label: "Domains",      icon: Globe,           color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
}

const SIZE = {
  xs: { badge: "px-1.5 py-0.5 text-[10px] gap-0.5", icon: 10 },
  sm: { badge: "px-2 py-0.5 text-xs gap-1",          icon:12 },
  md: { badge: "px-2.5 py-1 text-xs gap-1.5",        icon:13 },
}

export function CapabilityBadges({ capabilities = [], size = "sm", max }) {
  const visible = max ? capabilities.slice(0, max) : capabilities
  const overflow = max && capabilities.length > max ? capabilities.length - max : 0
  const s = SIZE[size] ?? SIZE.sm

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(cap => {
        const meta = CAPABILITY_META[cap] ?? {
          label: cap.charAt(0).toUpperCase() + cap.slice(1),
          icon: Code2,
          color: "text-muted-foreground bg-muted border-border",
        }
        const Icon = meta.icon
        return (
          <span
            key={cap}
            className={cn(
              "inline-flex items-center rounded-full border font-medium",
              s.badge,
              meta.color
            )}
          >
            <Icon size={s.icon} />
            {meta.label}
          </span>
        )
      })}
      {overflow > 0 && (
        <span className={cn(
          "inline-flex items-center rounded-full border font-medium bg-muted text-muted-foreground border-border",
          s.badge
        )}>
          +{overflow}
        </span>
      )}
    </div>
  )
}

export default CapabilityBadges
