"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import { EVENTS_REGISTRY as STATIC_EVENTS, findEventDef as staticFindEvent } from "@/lib/automation/events-registry"
import { getFriendlyName } from "@/components/automation/task-flow"
import { ConfirmDialog } from "@/components/automation/confirm-dialog"

import {
  Plus, Trash2, Play, Save, Code2, GripVertical, X,
  Settings2, Zap, GitBranch, RotateCcw,
  Layers, Shield, ShoppingCart, CreditCard, Server,
  MessageSquare, HardDrive, Users, Bell, Globe, Database,
  Search, Cpu, CheckCircle2, AlertCircle, Loader2,
  Workflow, Radio, ChevronDown, ChevronRight, Copy, Variable, HelpCircle,
} from "lucide-react"

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const API_BASE = () =>
  (typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/automation"
    : "http://localhost:4000/api/automation"
  ).replace(/\/$/, "")

const MODULE_ICONS = {
  auth:         Shield,
  orders:       ShoppingCart,
  billing:      CreditCard,
  services:     Server,
  provisioning: Cpu,
  support:      MessageSquare,
  backup:       HardDrive,
  clients:      Users,
  notify:       Bell,
  system:       Database,
  core:         Zap,
}

const MODULE_COLORS = {
  auth:         "bg-blue-100 text-blue-700 border-blue-200",
  orders:       "bg-orange-100 text-orange-700 border-orange-200",
  billing:      "bg-green-100 text-green-700 border-green-200",
  services:     "bg-purple-100 text-purple-700 border-purple-200",
  provisioning: "bg-cyan-100 text-cyan-700 border-cyan-200",
  support:      "bg-yellow-100 text-yellow-700 border-yellow-200",
  backup:       "bg-gray-100 text-gray-700 border-gray-200",
  clients:      "bg-indigo-100 text-indigo-700 border-indigo-200",
  notify:       "bg-pink-100 text-pink-700 border-pink-200",
  system:       "bg-slate-100 text-slate-700 border-slate-200",
  core:         "bg-violet-100 text-violet-700 border-violet-200",
}

const MODULE_BORDER = {
  auth:         "border-l-blue-400",
  orders:       "border-l-orange-400",
  billing:      "border-l-green-500",
  services:     "border-l-purple-400",
  provisioning: "border-l-cyan-400",
  support:      "border-l-yellow-400",
  backup:       "border-l-gray-400",
  clients:      "border-l-indigo-400",
  notify:       "border-l-pink-400",
  system:       "border-l-slate-400",
  core:         "border-l-violet-400",
}

const MODULE_ICON_BG = {
  auth:         "bg-blue-500",
  orders:       "bg-orange-500",
  billing:      "bg-green-600",
  services:     "bg-purple-500",
  provisioning: "bg-cyan-500",
  support:      "bg-yellow-500",
  backup:       "bg-gray-500",
  clients:      "bg-indigo-500",
  notify:       "bg-pink-500",
  system:       "bg-slate-500",
  core:         "bg-violet-500",
}

const TASK_TYPE_OPTS = [
  { value: "action",    label: "Action",    icon: Zap,       desc: "Run an automation action" },
  { value: "condition", label: "Condition", icon: GitBranch, desc: "Branch based on a condition" },
  { value: "loop",      label: "Loop",      icon: RotateCcw, desc: "Iterate over a list" },
  { value: "parallel",  label: "Parallel",  icon: Layers,    desc: "Run tasks concurrently" },
]

const TRIGGER_TYPES = [
  { value: "manual",  label: "Manual",  icon: Play,   desc: "Triggered by API or admin" },
  { value: "event",   label: "Event",   icon: Radio,  desc: "Triggered by a system event" },
  { value: "webhook", label: "Webhook", icon: Globe,  desc: "Triggered by incoming webhook" },
]

/* ─────────────────────────────────────────────────────────────
   Event lookup — delegates to the static local registry
───────────────────────────────────────────────────────────── */

function findEventDef(_eventsMap, eventType) {
  return staticFindEvent(eventType)
}

/* ─────────────────────────────────────────────────────────────
   VariableChips  — shows clickable {{token}} pills
───────────────────────────────────────────────────────────── */

function VariableChips({ eventDef, tasks, onInsert }) {
  const [copied, setCopied] = useState(null)

  const copy = (token) => {
    navigator.clipboard?.writeText?.(token).catch(() => {})
    setCopied(token)
    setTimeout(() => setCopied(null), 1500)
    onInsert?.(token)
  }

  const eventVars = eventDef?.payload
    ? Object.entries(eventDef.payload).map(([k, type]) => ({
        token: `{{input.${k}}}`,
        label: k,
        type,
        source: "trigger",
      }))
    : []

  const taskVars = tasks.flatMap((t, i) => [
    { token: `{{results.${t.id}.output}}`, label: `step${i + 1}.output`, type: "object", source: "task" },
    { token: `{{results.${t.id}.success}}`, label: `step${i + 1}.success`, type: "boolean", source: "task" },
  ])

  const allVars = [...eventVars, ...taskVars]
  if (allVars.length === 0) return null

  return (
    <div className="space-y-2">
      {eventVars.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Trigger Data
          </p>
          <div className="flex flex-wrap gap-1">
            {eventVars.map(({ token, label, type }) => (
              <button
                key={token}
                onClick={() => copy(token)}
                title={`Type: ${type} — click to copy`}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  copied === token
                    ? "bg-green-100 border-green-300 text-green-700"
                    : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/15"
                }`}
              >
                {copied === token ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                {`{{input.${label}}}`}
              </button>
            ))}
          </div>
        </div>
      )}
      {taskVars.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Previous Steps
          </p>
          <div className="flex flex-wrap gap-1">
            {taskVars.map(({ token, label }) => (
              <button
                key={token}
                onClick={() => copy(token)}
                title="Click to copy"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  copied === token
                    ? "bg-green-100 border-green-300 text-green-700"
                    : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {copied === token ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const newTask = (overrides = {}) => ({
  id:         `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  type:       "action",
  actionType: "",
  name:       "",
  input:      {},
  timeout:    30000,
  retry:      { times: 0, delay: 1000, backoff: "linear" },
  skipIf:     "",
  ...overrides,
})

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE()}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || `HTTP ${res.status}`)
  }
  return res.json()
}

function ModuleIcon({ module: mod, size = "w-4 h-4" }) {
  const Icon = MODULE_ICONS[mod] || Zap
  return <Icon className={size} />
}

/* ─────────────────────────────────────────────────────────────
   DraggableActionItem  (sidebar → canvas drop)
───────────────────────────────────────────────────────────── */

function DraggableActionItem({ action }) {
  const borderCls = MODULE_BORDER[action.module] || MODULE_BORDER.core
  const iconBg    = MODULE_ICON_BG[action.module] || MODULE_ICON_BG.core
  const Icon      = MODULE_ICONS[action.module] || Zap
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("application/action", JSON.stringify(action))}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg border border-l-[3px] bg-card hover:bg-muted/50 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all select-none ${borderCls}`}
    >
      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className="w-3 h-3 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-tight truncate">{action.name}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{action.description}</p>
      </div>
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   EventCard  (sidebar trigger picker)
───────────────────────────────────────────────────────────── */

function EventCard({ event, isSelected, onSelect }) {
  const borderCls = MODULE_BORDER[event.module] || MODULE_BORDER.core
  return (
    <button
      onClick={() => onSelect(event)}
      className={`w-full text-left group relative flex items-start gap-3 px-3 py-2.5 rounded-lg border border-l-[3px] transition-all select-none ${borderCls} ${
        isSelected
          ? "bg-primary/8 border-primary/40 shadow-sm ring-1 ring-primary/20"
          : "bg-card hover:bg-muted/50 hover:shadow-sm border-border"
      }`}
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
            {event.label}
          </p>
          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground truncate">{event.type}</p>
        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1 mt-0.5">{event.description}</p>
      </div>
      {!isSelected && (
        <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0 mt-1 group-hover:text-muted-foreground transition-colors" />
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   SortableTaskNode  (canvas node)
───────────────────────────────────────────────────────────── */

function SortableTaskNode({ task, index, isSelected, onSelect, onDelete, actions }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const actionDef = actions.find((a) => a.actionType === task.actionType || a.key === task.actionType)
  const mod = actionDef?.module || "core"
  const colorCls = MODULE_COLORS[mod] || MODULE_COLORS.core
  const TypeIcon = TASK_TYPE_OPTS.find((t) => t.value === task.type)?.icon || Zap

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {index > 0 && (
        <div className="flex justify-center py-1">
          <div className="w-px h-5 bg-border" />
        </div>
      )}

      <div
        className={`flex items-stretch rounded-xl border bg-card cursor-pointer transition-all shadow-sm ${
          isSelected
            ? "border-primary shadow-md ring-1 ring-primary/20"
            : "hover:border-primary/30 hover:shadow-md"
        }`}
        onClick={() => onSelect(task.id)}
      >
        {/* drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center px-2.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing rounded-l-xl hover:bg-muted/40 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* step badge */}
        <div className="flex items-center justify-center px-3 border-r">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {index + 1}
          </div>
        </div>

        {/* type icon + content */}
        <div className="flex-1 px-3 py-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${colorCls}`}>
              <TypeIcon className="w-3 h-3" />
            </div>
            <span className="text-sm font-semibold truncate">
              {task.name || getFriendlyName(task.actionType) || `${task.type} step`}
            </span>
            {task.actionType && (
              <Badge variant="secondary" className="text-[10px] ml-auto flex-shrink-0">{mod}</Badge>
            )}
          </div>
          {/* Step summary */}
          {(() => {
            const input = task.input || {}
            let summary = null
            const at = task.actionType || ""
            if (at.includes("http")) summary = `${input.method || "GET"} ${input.url || ""}`
            else if (at.includes("email") || at.includes("mail")) summary = input.to ? `To: ${input.to}` : null
            else if (task.type === "condition") summary = task.condition ? `If ${task.condition}` : null
            else if (at.includes("log")) summary = input.message ? `"${String(input.message).slice(0, 40)}"` : null
            else {
              const key = Object.keys(input).find(k => input[k] !== undefined && input[k] !== "")
              summary = key ? `${key}: ${String(input[key]).slice(0, 40)}` : null
            }
            return summary ? (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate pl-7">{summary}</p>
            ) : null
          })()}
        </div>

        {/* delete */}
        <button
          className="flex items-center px-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all rounded-r-xl hover:bg-destructive/10"
          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TaskConfigPanel  (right panel)
───────────────────────────────────────────────────────────── */

function TaskConfigPanel({ task, actions, onChange, onClose, eventDef, tasks: allTasks }) {
  const actionDef = actions.find((a) => a.actionType === task.actionType || a.key === task.actionType)
  const [varsOpen, setVarsOpen] = useState(true)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [lastFocused, setLastFocused] = useState(null)

  const update = (key, val) => onChange({ ...task, [key]: val })
  const updateInput = (key, val) => onChange({ ...task, input: { ...task.input, [key]: val } })
  const updateRetry = (key, val) => onChange({ ...task, retry: { ...task.retry, [key]: val } })

  const handleInsert = (token) => {
    if (!lastFocused) return
    const current = String(task.input?.[lastFocused] ?? "")
    updateInput(lastFocused, current + token)
  }

  const [rawInput, setRawInput] = useState(
    typeof task.input === "object" ? JSON.stringify(task.input, null, 2) : (task.input || "{}")
  )
  const [inputErr, setInputErr] = useState(null)

  useEffect(() => {
    setRawInput(typeof task.input === "object" ? JSON.stringify(task.input, null, 2) : (task.input || "{}"))
    setInputErr(null)
  }, [task.id])

  const handleInputChange = (val) => {
    setRawInput(val)
    try {
      onChange({ ...task, input: JSON.parse(val) })
      setInputErr(null)
    } catch {
      setInputErr("Invalid JSON")
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Configure Step</span>
        </div>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Step Name</Label>
            <Input
              value={task.name || ""}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Suspend overdue service"
              className="h-8 text-sm"
            />
          </div>

          {/* Task type */}
          <div className="space-y-1.5">
            <Label className="text-xs">What this step does</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {TASK_TYPE_OPTS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => update("type", value)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs font-medium transition-colors ${
                    task.type === value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted border-border"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Action selector */}
          {task.type === "action" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Choose action</Label>
              <Select value={task.actionType || ""} onValueChange={(v) => update("actionType", v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select an action…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(
                    actions.reduce((acc, a) => {
                      const mod = a.module || a.type || "core"
                      if (!acc[mod]) acc[mod] = []
                      acc[mod].push(a)
                      return acc
                    }, {})
                  ).map(([mod, items]) => (
                    <div key={mod}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{mod}</div>
                      {items.map((a) => (
                        <SelectItem key={a.actionType || a.key} value={a.actionType || a.key} className="text-sm">
                          {a.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              {actionDef && <p className="text-[11px] text-muted-foreground">{actionDef.description}</p>}
            </div>
          )}

          {/* Condition fields — dropdown builder */}
          {task.type === "condition" && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Condition</Label>

              {/* Visual builder */}
              <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Field</Label>
                  <Input
                    value={(task.condition || "").split(/\s*(===|!==|==|!=|>=|<=|>|<|contains|startsWith)\s*/)[0]?.trim() || ""}
                    onChange={(e) => {
                      const parts = (task.condition || "").split(/\s*(===|!==|==|!=|>=|<=|>|<|contains|startsWith)\s*/)
                      const op = parts[1] || "==="
                      const val = parts[2] || ""
                      update("condition", `${e.target.value} ${op} ${val}`)
                    }}
                    placeholder="{{input.status}}"
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Operator</Label>
                  <Select
                    value={
                      (task.condition || "").match(/\s*(===|!==|==|!=|>=|<=|>|<|contains|startsWith)\s*/)?.[1] || "==="
                    }
                    onValueChange={(op) => {
                      const parts = (task.condition || "").split(/\s*(===|!==|==|!=|>=|<=|>|<|contains|startsWith)\s*/)
                      const field = parts[0]?.trim() || ""
                      const val = parts[2]?.trim() || ""
                      update("condition", `${field} ${op} ${val}`)
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="===">equals (===)</SelectItem>
                      <SelectItem value="!==">not equals (!==)</SelectItem>
                      <SelectItem value=">">greater than (&gt;)</SelectItem>
                      <SelectItem value="<">less than (&lt;)</SelectItem>
                      <SelectItem value=">=">greater or equal (&gt;=)</SelectItem>
                      <SelectItem value="<=">less or equal (&lt;=)</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                      <SelectItem value="startsWith">starts with</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Value</Label>
                  <Input
                    value={(task.condition || "").split(/\s*(===|!==|==|!=|>=|<=|>|<|contains|startsWith)\s*/)[2]?.trim() || ""}
                    onChange={(e) => {
                      const parts = (task.condition || "").split(/\s*(===|!==|==|!=|>=|<=|>|<|contains|startsWith)\s*/)
                      const field = parts[0]?.trim() || ""
                      const op = parts[1] || "==="
                      update("condition", `${field} ${op} ${e.target.value}`)
                    }}
                    placeholder='"active"'
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Raw expression fallback */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Full expression</Label>
                <Input
                  value={task.condition || ""}
                  onChange={(e) => update("condition", e.target.value)}
                  placeholder='{{input.status}} === "active"'
                  className="h-7 text-xs font-mono text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">If true → go to</Label>
                  <Input value={task.onTrue || ""} onChange={(e) => update("onTrue", e.target.value)} placeholder="step ID" className="h-8 text-sm font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">If false → go to</Label>
                  <Input value={task.onFalse || ""} onChange={(e) => update("onFalse", e.target.value)} placeholder="step ID" className="h-8 text-sm font-mono" />
                </div>
              </div>
            </div>
          )}

          {/* Loop fields */}
          {task.type === "loop" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Items Expression</Label>
                <Input value={task.items || ""} onChange={(e) => update("items", e.target.value)} placeholder="{{input.ids}}" className="h-8 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Item Variable Name</Label>
                <Input value={task.itemName || "item"} onChange={(e) => update("itemName", e.target.value)} placeholder="item" className="h-8 text-sm font-mono" />
              </div>
            </div>
          )}

          <Separator />

          {/* Schema-driven params */}
          {task.type === "action" && actionDef?.schema?.properties && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Step Settings</Label>
              {Object.entries(actionDef.schema.properties).map(([key, prop]) => {
                const required = actionDef.schema.required?.includes(key)
                const val = task.input?.[key] ?? ""
                return (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      {prop.title || key}
                      {required && <span className="text-destructive">*</span>}
                    </Label>
                    {prop.enum ? (
                      <Select value={String(val)} onValueChange={(v) => updateInput(key, v)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={`Select…`} />
                        </SelectTrigger>
                        <SelectContent>
                          {prop.enum.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : prop.type === "boolean" ? (
                      <Switch checked={!!task.input?.[key]} onCheckedChange={(v) => updateInput(key, v)} />
                    ) : (
                      <Input
                        value={String(val)}
                        onChange={(e) => updateInput(key, e.target.value)}
                        onFocus={() => setLastFocused(key)}
                        placeholder={prop.description || String(prop.default ?? "")}
                        className="h-8 text-sm font-mono"
                      />
                    )}
                    {prop.description && <p className="text-[11px] text-muted-foreground">{prop.description}</p>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Raw JSON */}
          {(!actionDef?.schema?.properties || task.type !== "action") && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                Step Data (JSON)
                {inputErr && <span className="text-destructive text-[11px] ml-1">{inputErr}</span>}
              </Label>
              <Textarea
                value={rawInput}
                onChange={(e) => handleInputChange(e.target.value)}
                className={`font-mono text-xs min-h-[80px] ${inputErr ? "border-destructive" : ""}`}
                placeholder="{}"
                spellCheck={false}
              />
              <p className="text-[11px] text-muted-foreground">Use {"{{variable}}"} for dynamic values</p>
            </div>
          )}

          {/* Available Variables */}
          {(eventDef?.payload || (allTasks?.length > 0)) && (
            <div className="rounded-md border bg-muted/30">
              <button
                onClick={() => setVarsOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors rounded-md"
              >
                <Variable className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 text-left">Available Variables</span>
                {varsOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </button>
              {varsOpen && (
                <div className="px-3 pb-3">
                  <p className="text-[10px] text-muted-foreground mb-2">Click a token to copy it, then paste into any field above</p>
                  <VariableChips
                    eventDef={eventDef}
                    tasks={(allTasks || []).filter((t) => t.id !== task.id)}
                    onInsert={handleInsert}
                  />
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Advanced — collapsed by default */}
          <div className="rounded-md border bg-muted/30">
            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors rounded-md"
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="flex-1 text-left">Advanced Settings</span>
              {advancedOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </button>
            {advancedOpen && (
              <div className="px-3 pb-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Timeout (ms)</Label>
                    <Input type="number" value={task.timeout ?? 30000} onChange={(e) => update("timeout", Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Retry Times</Label>
                    <Input type="number" min={0} max={10} value={task.retry?.times ?? 0} onChange={(e) => updateRetry("times", Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                </div>
                {(task.retry?.times || 0) > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Retry Delay (ms)</Label>
                      <Input type="number" value={task.retry?.delay ?? 1000} onChange={(e) => updateRetry("delay", Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Backoff</Label>
                      <Select value={task.retry?.backoff || "linear"} onValueChange={(v) => updateRetry("backoff", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">Linear</SelectItem>
                          <SelectItem value="exponential">Exponential</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Skip If</Label>
                  <Input value={task.skipIf || ""} onChange={(e) => update("skipIf", e.target.value)} placeholder='{{input.skip}} === true' className="h-8 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Step ID</Label>
                  <Input value={task.id} readOnly className="h-8 text-xs font-mono bg-muted/50 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────────────────────── */

function Sidebar({ events, actions, workflow, onWorkflowChange }) {
  const [tab, setTab] = useState("trigger")
  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState({})
  const toggle = (k) => setCollapsed((p) => ({ ...p, [k]: !p[k] }))
  const q = search.toLowerCase()

  const filteredEvents = Object.entries(events).reduce((acc, [mod, group]) => {
    const hits = group.events.filter(
      (e) => !q || e.type.includes(q) || e.label.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    )
    if (hits.length) acc[mod] = { ...group, events: hits }
    return acc
  }, {})

  const filteredActions = actions.reduce((acc, a) => {
    const mod = a.module || a.type || "core"
    if (q && !a.name?.toLowerCase().includes(q) && !a.description?.toLowerCase().includes(q) && !mod.includes(q)) return acc
    if (!acc[mod]) acc[mod] = []
    acc[mod].push(a)
    return acc
  }, {})

  return (
    <div className="w-72 flex-shrink-0 border-r bg-card flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b px-3 pt-3 pb-0 flex-shrink-0">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="trigger" className="flex-1 text-xs gap-1"><Radio className="w-3 h-3" />Trigger</TabsTrigger>
            <TabsTrigger value="actions" className="flex-1 text-xs gap-1"><Zap className="w-3 h-3" />Actions</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 text-xs gap-1"><Settings2 className="w-3 h-3" />Settings</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Trigger type selector — fixed outside scroll */}
      {tab === "trigger" && (
        <div className="px-3 pt-3 pb-2 border-b flex-shrink-0 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">How to trigger</p>
          <div className="flex gap-1.5">
            {TRIGGER_TYPES.map(({ value, label, icon: Icon }) => {
              const active = (workflow.trigger || "manual") === value
              return (
                <button
                  key={value}
                  onClick={() => onWorkflowChange({ ...workflow, trigger: value })}
                  className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-center transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${active ? "bg-white/20" : "bg-muted"}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] font-semibold leading-tight">{label}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Search */}
      {tab !== "settings" && (
        <div className="px-3 py-2 border-b flex-shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "trigger" ? "Search events…" : "Search actions…"}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── TRIGGER TAB ── */}
        {tab === "trigger" && (
          <div className="p-3 space-y-3">
            {(workflow.trigger || "manual") === "event" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">System Events</p>
                  <span className="text-[10px] text-muted-foreground">{Object.values(filteredEvents).reduce((s, g) => s + g.events.length, 0)} events</span>
                </div>

                {/* Active selection pill */}
                {workflow.eventType && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/25">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-primary/70 font-medium">Selected</p>
                      <p className="text-[11px] font-mono text-primary font-semibold truncate">{workflow.eventType}</p>
                    </div>
                    <button
                      onClick={() => onWorkflowChange({ ...workflow, eventType: "" })}
                      className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Module groups */}
                <div className="space-y-3">
                  {Object.entries(filteredEvents).map(([mod, group]) => {
                    const Icon = MODULE_ICONS[mod] || Zap
                    const iconBg = MODULE_ICON_BG[mod] || MODULE_ICON_BG.core
                    const isCollapsed = collapsed[mod]
                    return (
                      <div key={mod} className="space-y-1.5">
                        <button
                          onClick={() => toggle(mod)}
                          className="w-full flex items-center gap-2 px-1 hover:opacity-80 transition-opacity"
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-foreground flex-1 text-left">{group.label}</span>
                          <span className="text-[10px] text-muted-foreground">{group.events.length}</span>
                          {isCollapsed
                            ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                        </button>
                        {!isCollapsed && (
                          <div className="space-y-1.5 pl-1">
                            {group.events.map((event) => (
                              <EventCard
                                key={event.type}
                                event={{ ...event, module: mod }}
                                isSelected={workflow.eventType === event.type}
                                onSelect={(e) => onWorkflowChange({ ...workflow, eventType: e.type, trigger: "event" })}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {Object.keys(filteredEvents).length === 0 && (
                  <div className="py-8 text-center">
                    <Search className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No events match &quot;{search}&quot;</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Radio className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">
                  {(workflow.trigger || "manual") === "manual"
                    ? "Triggered manually via API or admin panel"
                    : "Configure your webhook URL after saving"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIONS TAB ── */}
        {tab === "actions" && (
          <div className="p-3 space-y-3">
            <p className="text-[10px] text-muted-foreground px-0.5">Drag an action onto the canvas →</p>
            {Object.entries(filteredActions).map(([mod, items]) => {
              const Icon = MODULE_ICONS[mod] || Zap
              const iconBg = MODULE_ICON_BG[mod] || MODULE_ICON_BG.core
              const isCollapsed = collapsed[`a_${mod}`]
              return (
                <div key={mod} className="space-y-1.5">
                  <button
                    onClick={() => toggle(`a_${mod}`)}
                    className="w-full flex items-center gap-2 px-1 hover:opacity-80 transition-opacity"
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-foreground flex-1 text-left capitalize">{mod}</span>
                    <span className="text-[10px] text-muted-foreground">{items.length}</span>
                    {isCollapsed
                      ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-1 pl-1">
                      {items.map((action) => (
                        <DraggableActionItem key={action.actionType || action.key} action={action} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {Object.keys(filteredActions).length === 0 && (
              <div className="py-8 text-center">
                <Search className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No actions match &quot;{search}&quot;</p>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div className="p-3 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Workflow Name <span className="text-destructive">*</span></Label>
              <Input value={workflow.name || ""} onChange={(e) => onWorkflowChange({ ...workflow, name: e.target.value })} placeholder="My Workflow" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={workflow.description || ""} onChange={(e) => onWorkflowChange({ ...workflow, description: e.target.value })} placeholder="What does this workflow do?" className="text-sm min-h-[70px]" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="wf-enabled" checked={workflow.enabled !== false} onCheckedChange={(v) => onWorkflowChange({ ...workflow, enabled: v })} />
              <Label htmlFor="wf-enabled" className="text-xs cursor-pointer">Enabled</Label>
            </div>
            {workflow.eventType && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Active Trigger</p>
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs font-mono text-primary">{workflow.eventType}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   WorkflowBuilder (main export)
───────────────────────────────────────────────────────────── */

export default function WorkflowBuilder({ onError }) {
  const params     = useParams()
  const router     = useRouter()
  const workflowId = params?.workflowId

  const [workflow, setWorkflow] = useState({
    name: "", description: "", trigger: "manual", eventType: "", enabled: true,
    definition: { tasks: [] },
  })
  const [tasks, setTasks]           = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [events, setEvents]         = useState(STATIC_EVENTS)
  const [actions, setActions]       = useState([])
  const [loading, setLoading]       = useState(!!workflowId && workflowId !== "new")
  const [saving, setSaving]         = useState(false)
  const [running, setRunning]       = useState(false)
  const [toast, setToast]           = useState(null)
  const [jsonOpen, setJsonOpen]     = useState(false)
  const [guideOpen, setGuideOpen]   = useState(false)
  const [activeId, setActiveId]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    apiFetch("/registry")
      .then((res) => {
        const d = res?.data ?? res
        if (d.events && Object.keys(d.events).length) setEvents(d.events)
        const flat = Object.values(d.actions || {}).flat()
        if (flat.length) setActions(flat)
        else throw new Error("no actions")
      })
      .catch(() =>
        apiFetch("/actions")
          .then((r) => {
            const list = r?.data ?? []
            if (Array.isArray(list) && list.length) setActions(list)
          })
          .catch(() => {})
      )
  }, [])

  useEffect(() => {
    if (!workflowId || workflowId === "new") { setLoading(false); return }
    setLoading(true)
    apiFetch(`/workflows/${workflowId}`)
      .then((res) => {
        const wf = res?.data ?? res
        setWorkflow({ name: wf.name || "", description: wf.description || "", trigger: wf.trigger || "manual", eventType: wf.eventType || "", enabled: wf.enabled !== false, definition: wf.definition || { tasks: [] } })
        setTasks(wf.definition?.tasks || [])
      })
      .catch((e) => { onError?.(e); showToast(e.message, "error") })
      .finally(() => setLoading(false))
  }, [workflowId])

  const selectedTask = tasks.find((t) => t.id === selectedId)

  const updateTask = useCallback((updated) => setTasks((p) => p.map((t) => t.id === updated.id ? updated : t)), [])
  const deleteTask = useCallback((id) => { setTasks((p) => p.filter((t) => t.id !== id)); if (selectedId === id) setSelectedId(null) }, [selectedId])
  const addTask    = useCallback((actionDef = null) => {
    const t = newTask(actionDef ? { actionType: actionDef.actionType || actionDef.key || "", name: actionDef.name || "", type: "action" } : {})
    setTasks((p) => [...p, t])
    setSelectedId(t.id)
  }, [])

  const handleCanvasDrop = (e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData("application/action")
    if (!raw) return
    try { addTask(JSON.parse(raw)) } catch {}
  }

  const handleDragStart = ({ active }) => setActiveId(active.id)
  const handleDragEnd   = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    setTasks((prev) => {
      const oi = prev.findIndex((t) => t.id === active.id)
      const ni = prev.findIndex((t) => t.id === over.id)
      return arrayMove(prev, oi, ni)
    })
  }

  const buildDefinition = () => ({
    name: workflow.name || "Untitled Workflow",
    version: 1,
    tasks: tasks.map((t) => {
      const base = { id: t.id, type: t.type, ...(t.name && { name: t.name }) }
      if (t.type === "action")    return { ...base, actionType: t.actionType, input: t.input || {}, timeout: t.timeout, retry: t.retry, ...(t.skipIf && { skipIf: t.skipIf }) }
      if (t.type === "condition") return { ...base, condition: t.condition || "false", ...(t.onTrue && { onTrue: t.onTrue }), ...(t.onFalse && { onFalse: t.onFalse }) }
      if (t.type === "loop")      return { ...base, items: t.items || "[]", itemName: t.itemName || "item", tasks: t.tasks || [] }
      if (t.type === "parallel")  return { ...base, tasks: t.tasks || [] }
      return base
    }),
  })

  const handleSave = async () => {
    if (!workflow.name.trim()) { showToast("Workflow name is required", "error"); return }
    setSaving(true)
    try {
      const payload = { ...workflow, definition: buildDefinition() }
      if (workflowId && workflowId !== "new") {
        await apiFetch(`/workflows/${workflowId}`, { method: "PUT", body: JSON.stringify(payload) })
        showToast("Workflow saved")
      } else {
        const res = await apiFetch("/workflows", { method: "POST", body: JSON.stringify(payload) })
        const newId = res?.data?.id || res?.id
        showToast("Workflow created")
        if (newId) router.replace(`/admin/workflows/${newId}`)
      }
    } catch (e) {
      showToast(e.message, "error"); onError?.(e)
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    if (!workflowId || workflowId === "new") { showToast("Save first before running", "error"); return }
    setRunning(true)
    try {
      await apiFetch(`/workflows/${workflowId}/run`, { method: "POST", body: JSON.stringify({}) })
      showToast("Workflow started")
    } catch (e) {
      showToast(e.message, "error")
    } finally {
      setRunning(false)
    }
  }

  const activeTask = tasks.find((t) => t.id === activeId)

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] rounded-lg border bg-background overflow-hidden">

        {/* toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-card flex-shrink-0">
          <Workflow className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold truncate max-w-[200px]">{workflow.name || "Untitled Workflow"}</span>

          {workflow.eventType && (
            <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
              <Radio className="w-3 h-3" />{workflow.eventType}
            </Badge>
          )}
          <Badge variant={workflow.enabled ? "default" : "secondary"} className="text-[10px]">
            {workflow.enabled ? "Enabled" : "Disabled"}
          </Badge>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{tasks.length} step{tasks.length !== 1 ? "s" : ""}</Badge>
            {(() => {
              const unconfigured = tasks.filter(t => !t.actionType && t.type === "action").length
              return unconfigured > 0 ? (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 bg-amber-50 gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {unconfigured} step{unconfigured !== 1 ? "s" : ""} need{unconfigured === 1 ? "s" : ""} setup
                </Badge>
              ) : tasks.length > 0 ? (
                <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600 bg-emerald-50 gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  All configured
                </Badge>
              ) : null
            })()}
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setGuideOpen(true)}>
              <HelpCircle className="w-3.5 h-3.5" />Guide
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setJsonOpen(true)}>
              <Code2 className="w-3.5 h-3.5" />JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleRun} disabled={running || !workflowId || workflowId === "new"}>
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}Run
            </Button>
            <Button size="sm" className="gap-1.5 h-8" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
            </Button>
          </div>
        </div>

        {/* body */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar events={events} actions={actions} workflow={workflow} onWorkflowChange={setWorkflow} />

          {/* canvas */}
          <div
            className="flex-1 overflow-y-auto relative"
            style={{ background: "radial-gradient(circle, hsl(var(--muted-foreground)/0.08) 1px, transparent 1px)", backgroundSize: "20px 20px", backgroundColor: "hsl(var(--muted)/0.3)" }}
            onDrop={handleCanvasDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center py-8 px-4 min-h-full">
              <div className="w-full max-w-xl space-y-0">

                {/* TRIGGER NODE */}
                {(() => {
                  const eventDef = findEventDef(events, workflow.eventType)
                  const hasPayload = workflow.trigger === "event" && eventDef?.payload
                  const isEvent = workflow.trigger === "event" && workflow.eventType
                  return (
                    <div className={`rounded-xl border-2 shadow-sm bg-card transition-all ${
                      isEvent ? "border-primary/40 shadow-primary/10" : "border-border border-dashed"
                    }`}>
                      <div className="flex items-center gap-3 px-5 py-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isEvent ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                        }`}>
                          {workflow.trigger === "event" ? <Radio className="w-5 h-5" />
                            : workflow.trigger === "webhook" ? <Globe className="w-5 h-5" />
                            : <Play className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold truncate ${isEvent ? "text-primary" : "text-foreground"}`}>
                              {isEvent ? workflow.eventType
                                : workflow.trigger === "webhook" ? "Webhook Trigger"
                                : "Manual / API Trigger"}
                            </p>
                            {isEvent && (
                              <Badge className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary border border-primary/30 font-normal">trigger</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {workflow.trigger === "event" && !workflow.eventType ? "← Pick an event from the Trigger tab"
                              : workflow.trigger === "event" ? eventDef?.description || "Fires when this system event is emitted"
                              : workflow.trigger === "webhook" ? "Fires on incoming POST to the webhook URL"
                              : "Triggered manually via the Run button or API"}
                          </p>
                        </div>
                        {hasPayload && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary flex-shrink-0 gap-1">
                            <Variable className="w-2.5 h-2.5" />
                            {Object.keys(eventDef.payload).length} fields
                          </Badge>
                        )}
                      </div>

                      {hasPayload && (
                        <div className="px-5 pb-4 border-t border-primary/10 pt-3 space-y-2">
                          <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider flex items-center gap-1">
                            <Variable className="w-3 h-3" /> Available variables
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(eventDef.payload).map(([field, type]) => (
                              <div key={field} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/5 border border-primary/15 text-[11px]">
                                <span className="font-mono text-primary font-semibold">{`{{input.${field}}}`}</span>
                                <span className="text-muted-foreground/50">·</span>
                                <span className="text-muted-foreground italic">{type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {workflow.trigger === "webhook" && (
                        <div className="px-5 pb-4 border-t pt-3 space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Variable className="w-3 h-3" /> Webhook body
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {["{{input}}", "{{input.event}}", "{{input.payload}}"].map((t) => (
                              <span key={t} className="inline-flex px-2 py-1 rounded-lg bg-muted border text-[11px] font-mono text-muted-foreground">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {workflow.trigger === "manual" && (
                        <div className="px-5 pb-3 border-t pt-2.5">
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Variable className="w-3 h-3 flex-shrink-0" />
                            Pass JSON via Run API — reference with
                            <span className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">{"{{input.key}}"}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* connector */}
                <div className="flex flex-col items-center py-1">
                  <div className="w-px h-6 bg-border" />
                </div>

                {/* TASK NODES */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0">
                      {tasks.map((task, i) => (
                        <SortableTaskNode
                          key={task.id}
                          task={task}
                          index={i}
                          isSelected={selectedId === task.id}
                          onSelect={setSelectedId}
                          onDelete={(id) => setDeleteConfirm(tasks.find(t => t.id === id))}
                          actions={actions}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeTask && (
                      <div className="px-4 py-3 rounded-xl border border-primary/30 bg-card shadow-xl text-sm font-medium w-80">
                        {activeTask.name || activeTask.actionType || activeTask.type}
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>

                {/* EMPTY HINT */}
                {tasks.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-8 text-center select-none">
                    <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground/80 mb-1">No steps yet</p>
                      <p className="text-xs text-muted-foreground/60 max-w-[220px]">
                        Drag an action from the <strong className="text-muted-foreground/80">Actions</strong> tab, or click <strong className="text-muted-foreground/80">Add Step</strong> below
                      </p>
                    </div>
                  </div>
                )}

                {/* ADD STEP */}
                <div>
                  {tasks.length > 0 && (
                    <div className="flex flex-col items-center py-1">
                      <div className="w-px h-6 bg-border" />
                    </div>
                  )}
                  <button
                    onClick={() => addTask()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-muted-foreground/20 text-sm text-muted-foreground bg-background/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    Add Step
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* config panel */}
          {selectedTask && (
            <div className="w-72 flex-shrink-0 border-l bg-card overflow-hidden flex flex-col">
              <TaskConfigPanel
                task={selectedTask}
                actions={actions}
                onChange={updateTask}
                onClose={() => setSelectedId(null)}
                eventDef={findEventDef(events, workflow.eventType)}
                tasks={tasks}
              />
            </div>
          )}
        </div>

        {/* Step delete confirmation */}
        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title="Remove this step?"
          description={`"${deleteConfirm?.name || getFriendlyName(deleteConfirm?.actionType) || "This step"}" will be removed from the workflow.`}
          confirmLabel="Remove Step"
          onConfirm={() => {
            deleteTask(deleteConfirm?.id)
            setDeleteConfirm(null)
          }}
        />

        {/* toast */}
        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === "error" ? "bg-destructive" : "bg-green-600"}`}>
            {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Guide dialog */}
        <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                How to configure workflows
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
              <div className="space-y-5 py-1 pr-2">

                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Name your workflow</p>
                    <p className="text-xs text-muted-foreground">Open the <span className="font-mono bg-muted px-1 rounded">Settings</span> tab in the left sidebar. Enter a descriptive name and an optional description. Toggle <span className="font-mono bg-muted px-1 rounded">Enabled</span> when you are ready to activate it.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Choose a trigger type</p>
                    <p className="text-xs text-muted-foreground">In the <span className="font-mono bg-muted px-1 rounded">Trigger</span> tab, pick one of the three modes:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1 ml-1">
                      <li className="flex items-start gap-1.5"><Play className="w-3 h-3 mt-0.5 flex-shrink-0 text-foreground/60" /><span><strong className="text-foreground">Manual</strong> — run on-demand via the Run button or API call.</span></li>
                      <li className="flex items-start gap-1.5"><Radio className="w-3 h-3 mt-0.5 flex-shrink-0 text-foreground/60" /><span><strong className="text-foreground">Event</strong> — fires automatically when a system event occurs (e.g. an order is created, a payment fails).</span></li>
                      <li className="flex items-start gap-1.5"><Globe className="w-3 h-3 mt-0.5 flex-shrink-0 text-foreground/60" /><span><strong className="text-foreground">Webhook</strong> — triggered by an external HTTP POST to the workflow's webhook URL.</span></li>
                    </ul>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Pick a system event (Event trigger only)</p>
                    <p className="text-xs text-muted-foreground">After selecting <strong>Event</strong>, the sidebar shows all system events grouped by module. Use the search box to filter. Click an event card to select it — the selected event appears as a highlighted pill at the top.</p>
                    <p className="text-xs text-muted-foreground mt-1">Each event card shows the event type, a description, and the data fields it provides to your workflow steps.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Add steps to the canvas</p>
                    <p className="text-xs text-muted-foreground">Two ways to add a step:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1 ml-1 list-disc list-inside">
                      <li><strong className="text-foreground">Drag</strong> an action from the <span className="font-mono bg-muted px-1 rounded">Actions</span> tab and drop it onto the canvas.</li>
                      <li>Click <strong className="text-foreground">Add Step</strong> at the bottom of the canvas, then configure the action type in the right panel.</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-1">Steps execute top-to-bottom. Drag the grip handle on any step card to reorder them.</p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Configure each step</p>
                    <p className="text-xs text-muted-foreground">Click any step card to open the config panel on the right. You can:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1 ml-1 list-disc list-inside">
                      <li>Set the <strong className="text-foreground">Step Name</strong> (for readability).</li>
                      <li>Choose a <strong className="text-foreground">Step Type</strong>: Action, Condition, Loop, or Parallel.</li>
                      <li>For <strong className="text-foreground">Action</strong> steps, select an Action from the dropdown then fill in the input JSON.</li>
                      <li>Set a <strong className="text-foreground">Skip Condition</strong> to skip the step when a JS expression evaluates to true.</li>
                      <li>Configure <strong className="text-foreground">Retry</strong> settings (attempts, delay, backoff strategy).</li>
                    </ul>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">6</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Use variables in step inputs</p>
                    <p className="text-xs text-muted-foreground">Reference dynamic values inside any input field using double-curly-brace syntax:</p>
                    <div className="mt-1.5 space-y-1.5">
                      <div className="rounded-md bg-muted p-2.5 font-mono text-xs space-y-1">
                        <p className="text-primary font-semibold">Trigger data</p>
                        <p className="text-foreground/80">{"{{input.orderId}}"} &nbsp;&nbsp;— field from the triggering event</p>
                        <p className="text-foreground/80">{"{{input.clientId}}"}</p>
                      </div>
                      <div className="rounded-md bg-muted p-2.5 font-mono text-xs space-y-1">
                        <p className="text-amber-600 font-semibold">Previous step output</p>
                        <p className="text-foreground/80">{"{{results.task_xyz.output}}"} &nbsp;— full output object</p>
                        <p className="text-foreground/80">{"{{results.task_xyz.success}}"} — boolean</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">The config panel shows clickable variable pills — click one to copy it to your clipboard and paste into any input.</p>
                  </div>
                </div>

                {/* Step 7 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">7</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Save and run</p>
                    <p className="text-xs text-muted-foreground">Click <strong className="text-foreground">Save</strong> in the toolbar to persist the workflow. Once saved, click <strong className="text-foreground">Run</strong> to trigger it manually (useful for testing). Use the <strong className="text-foreground">JSON</strong> button to inspect the raw workflow definition that gets sent to the engine.</p>
                    <p className="text-xs text-muted-foreground mt-1">For event-triggered workflows, they will fire automatically once the workflow is enabled and the matching system event occurs.</p>
                  </div>
                </div>

                {/* Tips */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Tips</p>
                  <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-1">
                    <li>• Use <strong>system_log</strong> as your first step while building — it logs a message and confirms the workflow fires correctly.</li>
                    <li>• Use <strong>flow.assert</strong> to validate inputs early and stop the workflow if required data is missing.</li>
                    <li>• Use <strong>flow.stop</strong> with a condition to gracefully exit without marking the run as failed.</li>
                    <li>• Step IDs are stable — rename steps freely without breaking variable references.</li>
                  </ul>
                </div>

              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* JSON dialog */}
        <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Code2 className="w-4 h-4" />Workflow Definition</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 rounded-md border">
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">{JSON.stringify(buildDefinition(), null, 2)}</pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
