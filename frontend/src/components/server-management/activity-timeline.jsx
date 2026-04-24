"use client"

import { AlertTriangle, CheckCircle2, XCircle, Info, Wrench, Plus, RefreshCw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Map backend action strings → display config
const ACTION_MAP = {
  SERVER_CREATED:     { icon: Plus,          type: "success" },
  SERVER_UPDATED:     { icon: RefreshCw,     type: "log"     },
  SERVER_DELETED:     { icon: Trash2,        type: "error"   },
  CONNECTION_TESTED:  { icon: CheckCircle2,  type: "success" },
  ACCOUNT_CREATED:    { icon: Plus,          type: "success" },
  ACCOUNT_SUSPENDED:  { icon: AlertTriangle, type: "alert"   },
  ACCOUNT_TERMINATED: { icon: Trash2,        type: "error"   },
  MAINTENANCE_ON:     { icon: Wrench,        type: "alert"   },
  MAINTENANCE_OFF:    { icon: Wrench,        type: "success" },
}

const TYPE_CFG = {
  alert: {
    color:  "text-[oklch(0.72_0.18_70)]",
    bg:     "bg-[oklch(0.72_0.18_70/0.12)]",
    border: "border-[oklch(0.72_0.18_70/0.35)]",
  },
  error: {
    color:  "text-[oklch(0.52_0.22_25)]",
    bg:     "bg-[oklch(0.52_0.22_25/0.12)]",
    border: "border-[oklch(0.52_0.22_25/0.35)]",
  },
  success: {
    color:  "text-[oklch(0.64_0.2_145)]",
    bg:     "bg-[oklch(0.64_0.2_145/0.12)]",
    border: "border-[oklch(0.64_0.2_145/0.35)]",
  },
  log: {
    color:  "text-muted-foreground",
    bg:     "bg-secondary/50",
    border: "border-border",
  },
}

function getCfg(action = "") {
  const entry = ACTION_MAP[action.toUpperCase()] ?? {}
  const type  = entry.type ?? "log"
  const Icon  = entry.icon ?? Info
  return { Icon, ...TYPE_CFG[type] }
}

function formatRelative(iso) {
  if (!iso) return ""
  const diffMs  = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)  return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

export function ActivityTimeline({ logs = [], emptyMessage = "No activity yet" }) {
  if (!logs.length) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical rail */}
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border/50" />

      <div className="space-y-0">
        {logs.map((log, idx) => {
          const cfg    = getCfg(log.action)
          const Icon   = cfg.Icon
          const isLast = idx === logs.length - 1
          // Server name from join (getAllLogs includes server relation)
          const serverName = log.server?.name

          return (
            <div key={log.id ?? idx} className={cn("flex items-start gap-3 relative", !isLast && "pb-3")}>
              {/* Icon node */}
              <div className="flex-shrink-0 relative z-10">
                <div className={cn(
                  "w-[22px] h-[22px] rounded-md flex items-center justify-center border",
                  cfg.bg, cfg.border, cfg.color
                )}>
                  <Icon size={12} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-foreground leading-snug">{log.message}</span>
                  <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap flex-shrink-0 tabular-nums pt-px">
                    {formatRelative(log.createdAt)}
                  </span>
                </div>
                {serverName && (
                  <div className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">{serverName}</div>
                )}
                <div className="text-[10px] text-muted-foreground/40 mt-0.5 uppercase tracking-wide">
                  {log.action?.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
