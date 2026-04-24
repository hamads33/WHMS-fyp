"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Puzzle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Renders dynamic plugin-contributed sidebar navigation entries.
 * Used inside admin-sidebar.js after the static NAV_GROUPS.
 *
 * @param {{ entries: Array<{plugin: string, name: string, pages: Array<{id:string, label:string, icon?:string}>}>, pathname: string, collapsed: boolean }} props
 */
export function PluginSidebarSection({ entries = [], pathname, collapsed }) {
  if (!entries.length) return null

  return (
    <div className="space-y-0.5">
      {entries.map(entry => (
        <div key={entry.plugin}>
          {!collapsed && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none truncate">
              {entry.name}
            </p>
          )}
          {entry.pages.map(page => {
            const href = `/admin/plugins/ui/${entry.plugin}/${page.id}`
            const isActive = pathname === href || pathname.startsWith(href + "/")

            const content = (
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed ? "justify-center px-2" : "justify-start",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-foreground" />
                )}
                <Puzzle className={cn(
                  "h-[15px] w-[15px] shrink-0",
                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!collapsed && (
                  <span className="flex-1 truncate leading-none">{page.label}</span>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={page.id} delayDuration={0}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs font-medium">
                    {entry.name} — {page.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={page.id}>{content}</div>
          })}
        </div>
      ))}
    </div>
  )
}
