"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Globe,
  Code,
  Database,
  Mail,
  Webhook,
  Zap,
  Search,
  CreditCard,
  Users,
  Bell,
  Server,
  Shield,
  ShoppingCart,
  HardDrive,
  Cpu,
  MessageSquare,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Star,
} from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"
import { getFriendlyName } from "@/components/automation/task-flow"

/**
 * ActionPalette
 * ----------------------------------------------------
 * Fetches actions from backend registry
 * Groups by module with search + popular actions
 */

/* ── Module icons ── */
const MODULE_ICONS = {
  billing:      CreditCard,
  notify:       Bell,
  users:        Users,
  clients:      Users,
  services:     Server,
  orders:       ShoppingCart,
  auth:         Shield,
  provisioning: Cpu,
  support:      MessageSquare,
  backup:       HardDrive,
  system:       Database,
  flow:         GitBranch,
  core:         Zap,
  http:         Globe,
}

const MODULE_COLORS = {
  billing:      "bg-green-100 text-green-700",
  notify:       "bg-pink-100 text-pink-700",
  users:        "bg-indigo-100 text-indigo-700",
  clients:      "bg-indigo-100 text-indigo-700",
  services:     "bg-purple-100 text-purple-700",
  orders:       "bg-orange-100 text-orange-700",
  auth:         "bg-blue-100 text-blue-700",
  provisioning: "bg-cyan-100 text-cyan-700",
  support:      "bg-yellow-100 text-yellow-700",
  backup:       "bg-gray-100 text-gray-700",
  system:       "bg-slate-100 text-slate-700",
  flow:         "bg-violet-100 text-violet-700",
  core:         "bg-violet-100 text-violet-700",
  http:         "bg-blue-100 text-blue-700",
}

/* ── Popular actions (common first-picks) ── */
const POPULAR_KEYS = [
  "http_request",
  "notify.send_email",
  "system_log",
  "billing.create_invoice",
  "flow.assert",
]

function getActionIcon(key = "") {
  const s = key.toLowerCase()
  if (s.includes("http") || s.includes("request") || s.includes("webhook")) return Globe
  if (s.includes("billing") || s.includes("invoice") || s.includes("payment")) return CreditCard
  if (s.includes("mail") || s.includes("email")) return Mail
  if (s.includes("notify") || s.includes("sms")) return Bell
  if (s.includes("user") || s.includes("client")) return Users
  if (s.includes("service") || s.includes("server")) return Server
  if (s.includes("order")) return ShoppingCart
  if (s.includes("backup")) return HardDrive
  if (s.includes("provision")) return Cpu
  if (s.includes("support") || s.includes("ticket")) return MessageSquare
  if (s.includes("auth")) return Shield
  if (s.includes("condition") || s.includes("assert") || s.includes("flow")) return GitBranch
  if (s.includes("log") || s.includes("database") || s.includes("system")) return Database
  if (s.includes("hook")) return Webhook
  return Code
}

function getActionDescription(key = "") {
  const s = key.toLowerCase()
  if (s.includes("http_request")) return "Send an HTTP request to any URL"
  if (s.includes("system_log")) return "Write a message to the system log"
  if (s.includes("echo")) return "Output a value for debugging"
  if (s.includes("mail") || s.includes("email")) return "Send an email notification"
  if (s.includes("webhook")) return "Trigger a webhook endpoint"
  if (s.includes("invoice")) return "Create or manage invoices"
  if (s.includes("payment")) return "Process a payment transaction"
  if (s.includes("user") || s.includes("client")) return "Manage user accounts"
  if (s.includes("service")) return "Manage hosting services"
  if (s.includes("order")) return "Process an order"
  if (s.includes("backup")) return "Manage backups"
  if (s.includes("ticket")) return "Manage support tickets"
  if (s.includes("provision")) return "Provision or manage servers"
  if (s.includes("assert")) return "Validate conditions before continuing"
  if (s.includes("stop")) return "Stop workflow execution"
  if (s.includes("delay") || s.includes("wait")) return "Pause before the next step"
  if (s.includes("transform")) return "Transform data between steps"
  return "Run this automation action"
}

function getModule(action) {
  if (action.module) return action.module
  const key = action.key || ""
  if (key.includes(".")) return key.split(".")[0]
  if (key.includes("http")) return "http"
  if (key.includes("system") || key.includes("log") || key.includes("echo")) return "system"
  return "core"
}

function ActionCard({ action, onSelectAction }) {
  if (!action?.key) return null

  const Icon = getActionIcon(action.key)
  const description = getActionDescription(action.key)
  const mod = getModule(action)
  const colorCls = MODULE_COLORS[mod] || MODULE_COLORS.core

  return (
    <button
      onClick={() =>
        onSelectAction({
          actionType: action.key,
          displayName: action.name,
          actionSchema: action.schema || null,
        })
      }
      className="w-full text-left group"
    >
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/60 hover:bg-primary/5 transition-all duration-150 cursor-pointer">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors mt-0.5 ${colorCls}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
            {getFriendlyName(action.key) || action.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
          <Skeleton className="w-8 h-8 rounded-md shrink-0" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ModuleGroup({ module: mod, actions, onSelectAction, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = MODULE_ICONS[mod] || Zap
  const colorCls = MODULE_COLORS[mod] || MODULE_COLORS.core
  const label = mod.charAt(0).toUpperCase() + mod.slice(1)

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-1 hover:opacity-80 transition-opacity"
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${colorCls}`}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-xs font-semibold text-foreground flex-1 text-left">{label}</span>
        <span className="text-[10px] text-muted-foreground">{actions.length}</span>
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
      </button>
      {open && (
        <div className="space-y-1.5 pl-1">
          {actions.map((action) => (
            <ActionCard
              key={action.key}
              action={action}
              onSelectAction={onSelectAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ActionPalette({ onSelectAction }) {
  const [allActions, setAllActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let alive = true

    async function loadActions() {
      try {
        const res = await AutomationAPI.listActions()
        const actions = res?.data ?? []
        if (!alive) return
        setAllActions(actions)
      } catch (err) {
        console.error("Failed to load actions:", err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadActions()
    return () => { alive = false }
  }, [])

  const q = search.toLowerCase().trim()

  // Filter by search
  const filtered = useMemo(() => {
    if (!q) return allActions
    return allActions.filter(a => {
      const friendlyName = getFriendlyName(a.key)
      return (
        a.key?.toLowerCase().includes(q) ||
        a.name?.toLowerCase().includes(q) ||
        friendlyName?.toLowerCase().includes(q) ||
        getModule(a).includes(q)
      )
    })
  }, [allActions, q])

  // Popular actions (only when not searching)
  const popular = useMemo(() => {
    if (q) return []
    return POPULAR_KEYS
      .map(key => allActions.find(a => a.key === key))
      .filter(Boolean)
  }, [allActions, q])

  // Group by module
  const grouped = useMemo(() => {
    const groups = {}
    for (const action of filtered) {
      const mod = getModule(action)
      if (!groups[mod]) groups[mod] = []
      groups[mod].push(action)
    }
    // Sort modules alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Actions</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Click to add to your workflow
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Search */}
      <div className="px-6 pb-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <CardContent className="space-y-4 flex-1 overflow-y-auto">
        {loading && <LoadingSkeleton />}

        {!loading && (
          <>
            {/* Popular actions */}
            {popular.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Popular
                  </span>
                </div>
                <div className="space-y-1.5">
                  {popular.map((action) => (
                    <ActionCard
                      key={`popular:${action.key}`}
                      action={action}
                      onSelectAction={onSelectAction}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Grouped by module */}
            {grouped.length > 0 ? (
              <div className="space-y-3">
                {popular.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      All Actions
                    </span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 font-medium">
                      {filtered.length}
                    </Badge>
                  </div>
                )}
                {grouped.map(([mod, actions]) => (
                  <ModuleGroup
                    key={mod}
                    module={mod}
                    actions={actions}
                    onSelectAction={onSelectAction}
                    defaultOpen={grouped.length <= 3 || !!q}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Search className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No actions match &quot;{search}&quot;</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
