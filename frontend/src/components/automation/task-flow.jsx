"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Settings2,
  Trash2,
  Play,
  Globe,
  Code,
  Database,
  Mail,
  Webhook,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
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
} from "lucide-react"

/**
 * TaskFlow
 * ----------------------------------------------------
 * Displays ordered automation tasks
 */

/* ── Friendly names mapping ── */
const FRIENDLY_NAMES = {
  "billing.create_invoice":     "Create Invoice",
  "billing.process_payment":    "Process Payment",
  "billing.send_invoice":       "Send Invoice",
  "billing.refund_payment":     "Refund Payment",
  "billing.cancel_invoice":     "Cancel Invoice",
  "billing.apply_credit":       "Apply Credit",
  "notify.send_email":          "Send Email",
  "notify.send_sms":            "Send SMS",
  "notify.send_notification":   "Send Notification",
  "notify.send_webhook":        "Send Webhook",
  "users.create_user":          "Create User",
  "users.update_user":          "Update User",
  "users.suspend_user":         "Suspend User",
  "users.delete_user":          "Delete User",
  "services.create_service":    "Create Service",
  "services.suspend_service":   "Suspend Service",
  "services.unsuspend_service": "Unsuspend Service",
  "services.terminate_service": "Terminate Service",
  "services.upgrade_service":   "Upgrade Service",
  "orders.create_order":        "Create Order",
  "orders.process_order":       "Process Order",
  "orders.cancel_order":        "Cancel Order",
  "provisioning.provision":     "Provision Server",
  "provisioning.deprovision":   "Deprovision Server",
  "support.create_ticket":      "Create Ticket",
  "support.close_ticket":       "Close Ticket",
  "backup.create_backup":       "Create Backup",
  "backup.restore_backup":      "Restore Backup",
  "http_request":               "HTTP Request",
  "system_log":                 "System Log",
  "echo":                       "Echo",
  "flow.assert":                "Assert Condition",
  "flow.stop":                  "Stop Workflow",
  "flow.delay":                 "Delay / Wait",
  "flow.transform":             "Transform Data",
}

export function getFriendlyName(actionType = "") {
  if (FRIENDLY_NAMES[actionType]) return FRIENDLY_NAMES[actionType]
  // Try partial match for keys that end with the action
  const match = Object.entries(FRIENDLY_NAMES).find(([key]) => actionType.endsWith(key))
  if (match) return match[1]
  // Fallback: humanize the action type
  const base = actionType.includes(".") ? actionType.split(".").pop() : actionType
  return base
    .replace(/[_.]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    || actionType
}

/* ── Step summary generator ── */
function getStepSummary(task) {
  const input = task?.actionMeta || task?.input || {}
  const actionType = task?.actionType || ""

  if (actionType.includes("http_request") || actionType.includes("http")) {
    return `${input.method || "GET"} ${input.url || "No URL"}`
  }

  if (actionType.includes("email") || actionType.includes("mail")) {
    return input.to ? `To: ${input.to}` : input.recipient ? `To: ${input.recipient}` : null
  }

  if (task?.type === "condition" || actionType.includes("assert")) {
    const cond = task.condition || input.condition || input.expression
    return cond ? `If ${cond}` : null
  }

  if (actionType.includes("system_log") || actionType.includes("log")) {
    return input.message ? `"${String(input.message).slice(0, 50)}"` : null
  }

  if (actionType.includes("delay") || actionType.includes("wait")) {
    return input.duration ? `Wait ${input.duration}ms` : input.seconds ? `Wait ${input.seconds}s` : null
  }

  if (actionType.includes("invoice")) {
    return input.clientId ? `Client: ${input.clientId}` : input.amount ? `Amount: $${input.amount}` : null
  }

  if (actionType.includes("webhook")) {
    return input.url ? `→ ${input.url}` : null
  }

  // Generic: show first meaningful input key
  const key = Object.keys(input).find(k => input[k] !== undefined && input[k] !== "")
  return key ? `${key}: ${String(input[key]).slice(0, 40)}` : null
}

function getActionIcon(actionType = "") {
  const type = actionType.toLowerCase()
  if (type.includes("http") || type.includes("request") || type.includes("webhook")) return Globe
  if (type.includes("billing") || type.includes("invoice") || type.includes("payment") || type.includes("credit")) return CreditCard
  if (type.includes("user") || type.includes("client")) return Users
  if (type.includes("mail") || type.includes("email")) return Mail
  if (type.includes("notify") || type.includes("notification") || type.includes("sms")) return Bell
  if (type.includes("service") || type.includes("server")) return Server
  if (type.includes("auth") || type.includes("shield")) return Shield
  if (type.includes("order") || type.includes("cart")) return ShoppingCart
  if (type.includes("backup") || type.includes("restore")) return HardDrive
  if (type.includes("provision")) return Cpu
  if (type.includes("support") || type.includes("ticket")) return MessageSquare
  if (type.includes("condition") || type.includes("assert") || type.includes("branch")) return GitBranch
  if (type.includes("log") || type.includes("database") || type.includes("system")) return Database
  if (type.includes("hook")) return Webhook
  return Code
}

export function TaskFlow({
  tasks = [],
  onConfigure,
  onRemove,
  onRunTask,
}) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Zap className="w-7 h-7 text-primary" />
        </div>
        <p className="font-semibold text-foreground mb-1 text-base">Build your workflow</p>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          Get started in three simple steps:
        </p>

        <div className="space-y-3 text-left max-w-xs w-full">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
            <div>
              <p className="text-sm font-medium">Choose an action</p>
              <p className="text-xs text-muted-foreground">Pick from the action palette on the left</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Configure the step</p>
              <p className="text-xs text-muted-foreground">Set up inputs and parameters</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Add more steps</p>
              <p className="text-xs text-muted-foreground">Chain actions together to build your flow</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isConfigured = (task) => {
    const required = task?.actionSchema?.required
    if (!required?.length) return true

    return required.every(
      (key) =>
        task.actionMeta?.[key] !== undefined &&
        task.actionMeta?.[key] !== ""
    )
  }

  return (
    <div className="space-y-1" role="list">
      {tasks.map((task, index) => {
        const actionType = task?.actionType ?? ""
        const plugin = actionType.startsWith("plugin:")
        const configured = isConfigured(task)
        const ActionIcon = getActionIcon(actionType)
        const isLast = index === tasks.length - 1

        return (
          <div key={task.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}>
            <Card
              className={`p-4 border-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
                configured
                  ? "border-border hover:border-primary/40"
                  : "border-amber-200 bg-amber-50/30 hover:border-amber-300"
              }`}
              onClick={() => onConfigure?.(task.id)}
            >
              <div className="flex items-center gap-3">
                {/* Numbered circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    configured
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Action icon */}
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    configured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <ActionIcon className="w-4 h-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">
                    {task.displayName && task.displayName !== actionType
                      ? task.displayName
                      : getFriendlyName(actionType)}
                  </p>

                  {/* Step summary */}
                  {(() => {
                    const summary = getStepSummary(task)
                    return summary ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 leading-snug">
                        {summary}
                      </p>
                    ) : null
                  })()}

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Action type badge */}
                    <Badge
                      variant="outline"
                      className="text-xs font-mono py-0 h-5 text-muted-foreground"
                    >
                      {plugin ? "plugin" : "built-in"}
                    </Badge>

                    {/* Configured status */}
                    {configured ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Needs setup
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRunTask?.(task.id)}
                    disabled={!configured}
                    title={configured ? "Run this task" : "Configure task before running"}
                    className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onConfigure?.(task.id)}
                    title="Configure task"
                    className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove?.(task.id)}
                    title="Remove task"
                    className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Arrow connector between tasks */}
            {!isLast && (
              <div className="flex justify-center py-0.5">
                <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
