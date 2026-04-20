"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search, RefreshCcw, MessageSquare, Clock, User, Tag,
  Headphones, Send, Lock, LockOpen, ChevronRight,
  AlertCircle, Inbox, CheckCircle, AlertTriangle, Zap,
  Circle, ArrowLeft, MoreVertical,
} from "lucide-react"
import { AdminSupportAPI } from "@/lib/api/support"
import { cn } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(d) {
  if (!d) return "—"
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

function fmtFull(d) {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

const STATUS = {
  open:               { label: "Open",            color: "text-accent bg-accent/10 border-accent",  dot: "bg-accent",   icon: Circle },
  waiting_for_staff:  { label: "Waiting Staff",   color: "text-muted-foreground bg-muted border-border",    dot: "bg-muted-foreground",    icon: Clock },
  waiting_for_client: { label: "Waiting Client",  color: "text-muted-foreground bg-muted border-border",       dot: "bg-muted-foreground",     icon: Clock },
  on_hold:            { label: "On Hold",          color: "text-destructive bg-destructive/10 border-destructive",    dot: "bg-destructive",    icon: AlertCircle },
  closed:             { label: "Closed",           color: "text-muted-foreground bg-muted border-border",       dot: "bg-muted-foreground",     icon: CheckCircle },
}

const PRIORITY = {
  low:    { label: "Low",    color: "text-muted-foreground bg-muted border-border",    bar: "bg-muted-foreground" },
  medium: { label: "Med",    color: "text-foreground bg-muted border-border",          bar: "bg-foreground" },
  high:   { label: "High",   color: "text-destructive bg-destructive/10 border-destructive", bar: "bg-destructive" },
  urgent: { label: "Urgent", color: "text-destructive bg-destructive/10 border-destructive",          bar: "bg-destructive" },
}

function StatusPill({ status }) {
  const s = STATUS[status] ?? { label: status, color: "text-muted-foreground bg-muted border-border", dot: "bg-muted-foreground" }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", s.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

function PriorityPill({ priority }) {
  const p = PRIORITY[priority] ?? { label: priority, color: "text-muted-foreground bg-muted border-border" }
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", p.color)}>
      {p.label}
    </span>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ tickets }) {
  const counts = {
    open:    tickets.filter(t => t.status === "open").length,
    waiting: tickets.filter(t => t.status.startsWith("waiting")).length,
    urgent:  tickets.filter(t => t.priority === "urgent").length,
    closed:  tickets.filter(t => t.status === "closed").length,
  }
  const items = [
    { label: "Open",    value: counts.open,    icon: Inbox,         bg: "bg-accent" },
    { label: "Waiting", value: counts.waiting, icon: Clock,         bg: "bg-muted-foreground" },
    { label: "Urgent",  value: counts.urgent,  icon: AlertTriangle, bg: "bg-destructive" },
    { label: "Closed",  value: counts.closed,  icon: CheckCircle,   bg: "bg-muted-foreground" },
  ]
  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(({ label, value, icon: Icon, bg }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", bg)}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Ticket Row (list item) ────────────────────────────────────────────────────

function TicketRow({ ticket, active, onClick }) {
  const p = PRIORITY[ticket.priority] ?? {}
  const hasUnread = ticket.status === "waiting_for_staff"
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b border-border/50 transition-colors relative",
        "hover:bg-muted/60",
        active ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
      )}
    >
      {/* Priority bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", p.bar ?? "bg-transparent")} />

      <div className="flex items-start justify-between gap-2 pl-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-muted-foreground">{ticket.ticketNumber}</span>
            {hasUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
          </div>
          <p className={cn("text-sm leading-snug line-clamp-2", hasUnread ? "font-semibold" : "font-medium")}>
            {ticket.subject}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusPill status={ticket.status} />
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.client?.email?.split("@")[0] ?? "—"}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(ticket.updatedAt ?? ticket.createdAt)}</p>
          <div className="mt-1 flex justify-end">
            <PriorityPill priority={ticket.priority} />
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function Bubble({ reply, clientId }) {
  const isClient = reply.authorId === clientId
  const isInternal = reply.type === "internal"

  if (isInternal) {
    return (
      <div className="flex gap-2.5 px-1">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Headphones className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-foreground">{reply.author?.email?.split("@")[0] ?? "Staff"}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground tracking-wide">Internal</span>
            <span className="text-[10px] text-muted-foreground">{fmtFull(reply.createdAt)}</span>
          </div>
          <div className="rounded-xl rounded-tl-sm border border-border bg-muted px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
            {reply.body}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-2.5 px-1", isClient && "flex-row-reverse")}>
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        isClient ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {isClient ? <User className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
      </div>
      <div className={cn("max-w-[75%]", isClient && "items-end")}>
        <div className={cn("flex items-center gap-2 mb-1", isClient && "flex-row-reverse")}>
          <span className="text-xs font-semibold">{reply.author?.email?.split("@")[0] ?? "—"}</span>
          <span className="text-[10px] text-muted-foreground">{fmtFull(reply.createdAt)}</span>
        </div>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isClient
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}>
          {reply.body}
        </div>
      </div>
    </div>
  )
}

// ── Ticket Detail Panel ───────────────────────────────────────────────────────

function DetailPanel({ ticket: initial, onBack, onRefresh }) {
  const [ticket, setTicket] = useState(initial)
  const [loadingTicket, setLoadingTicket] = useState(true)
  const [reply, setReply] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    setLoadingTicket(true)
    AdminSupportAPI.getTicket(initial.id)
      .then(res => setTicket(res?.ticket ?? res?.data ?? res))
      .catch(() => setTicket(initial))
      .finally(() => setLoadingTicket(false))
  }, [initial.id])

  const isClosed = ticket.status === "closed"
  const allReplies = ticket.replies ?? []

  async function handleReply() {
    if (!reply.trim()) return
    setSending(true)
    try {
      await AdminSupportAPI.addReply(ticket.id, reply.trim(), isInternal)
      setReply("")
      const res = await AdminSupportAPI.getTicket(ticket.id)
      setTicket(res?.ticket ?? res?.data ?? res)
    } catch {}
    setSending(false)
  }

  async function act(fn, merge) {
    setActionLoading(fn.name ?? "act")
    try { await fn(); setTicket(prev => ({ ...prev, ...merge })); onRefresh() } catch {}
    setActionLoading(null)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Detail header */}
      <div className="flex items-start gap-3 border-b border-border px-6 py-4">
        <button onClick={onBack} className="mt-0.5 rounded-lg p-1.5 hover:bg-muted transition-colors lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
            <StatusPill status={ticket.status} />
            <PriorityPill priority={ticket.priority} />
          </div>
          <h2 className="text-base font-semibold leading-snug line-clamp-2">{ticket.subject}</h2>
        </div>
      </div>

      {/* Meta + quick actions */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-muted/30 px-6 py-2.5">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />{ticket.client?.email ?? "—"}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Tag className="h-3.5 w-3.5" />{ticket.department?.name ?? "General"}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />{fmtFull(ticket.createdAt)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={ticket.status}
            onValueChange={(v) => act(() => AdminSupportAPI.changeStatus(ticket.id, v), { status: v })}
            disabled={!!actionLoading}
          >
            <SelectTrigger className="h-7 text-xs w-40 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="waiting_for_staff">Waiting (Staff)</SelectItem>
              <SelectItem value="waiting_for_client">Waiting (Client)</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={ticket.priority}
            onValueChange={(v) => act(() => AdminSupportAPI.changePriority(ticket.id, v), { priority: v })}
            disabled={!!actionLoading}
          >
            <SelectTrigger className="h-7 text-xs w-24 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          {!isClosed ? (
            <Button
              variant="outline" size="sm"
              className="h-7 text-xs gap-1 bg-background"
              onClick={() => act(() => AdminSupportAPI.closeTicket(ticket.id), { status: "closed" })}
              disabled={!!actionLoading}
            >
              <Lock className="h-3 w-3" />Close
            </Button>
          ) : (
            <Button
              variant="outline" size="sm"
              className="h-7 text-xs gap-1 bg-background"
              onClick={() => act(() => AdminSupportAPI.reopenTicket(ticket.id), { status: "open" })}
              disabled={!!actionLoading}
            >
              <LockOpen className="h-3 w-3" />Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {loadingTicket ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs">Loading conversation…</p>
          </div>
        ) : allReplies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          allReplies.map(r => <Bubble key={r.id} reply={r} clientId={ticket.clientId} />)
        )}
      </div>

      {/* Reply composer */}
      {!isClosed && (
        <div className="border-t border-border px-6 py-4 space-y-3 bg-background">
          {/* Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
            {[
              { key: false, label: "Public Reply" },
              { key: true,  label: "Internal Note" },
            ].map(({ key, label }) => (
              <button
                key={label}
                onClick={() => setIsInternal(key)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                  isInternal === key
                    ? key
                      ? "bg-muted text-foreground shadow-sm"
                      : "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            placeholder={isInternal ? "Add an internal note (staff only)…" : "Type a reply to the client…"}
            className={cn(
              "resize-none text-sm border-0 bg-muted/40 focus-visible:ring-1",
              isInternal && "bg-muted focus-visible:ring-muted-foreground"
            )}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply() }}
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">⌘ + Enter to send</p>
            <Button
              size="sm"
              className={cn("gap-1.5 h-8 text-xs", isInternal && "bg-muted hover:bg-muted text-foreground")}
              onClick={handleReply}
              disabled={!reply.trim() || sending}
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : isInternal ? "Add Note" : "Send Reply"}
            </Button>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="border-t border-border bg-muted/30 px-6 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Ticket closed.{" "}
            <button
              onClick={() => act(() => AdminSupportAPI.reopenTicket(ticket.id), { status: "open" })}
              className="text-primary hover:underline underline-offset-2"
            >
              Reopen it
            </button>{" "}
            to continue the conversation.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",     label: "All" },
  { key: "open",    label: "Open" },
  { key: "waiting", label: "Waiting" },
  { key: "urgent",  label: "Urgent" },
  { key: "closed",  label: "Closed" },
]

export default function AdminSupportPage() {
  const [tickets, setTickets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState("")
  const [tab, setTab]               = useState("all")
  const [selected, setSelected]     = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await AdminSupportAPI.listTickets()
      setTickets(res?.rows ?? res?.tickets ?? res?.data ?? [])
    } catch (e) {
      setError(e.message || "Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      t.ticketNumber?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.client?.email?.toLowerCase().includes(q)

    const matchTab =
      tab === "all" ? true :
      tab === "open" ? t.status === "open" :
      tab === "waiting" ? t.status.startsWith("waiting") :
      tab === "urgent" ? t.priority === "urgent" :
      tab === "closed" ? t.status === "closed" : true

    return matchSearch && matchTab
  })

  function handleSelect(t) {
    setSelected(t)
    setShowDetail(true)
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Support Inbox</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{tickets.length} total tickets</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="px-6 py-4 shrink-0">
        <StatsBar tickets={tickets} />
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: ticket list */}
        <div className={cn(
          "flex flex-col border-r border-border bg-background shrink-0",
          "w-full lg:w-[380px]",
          showDetail && selected ? "hidden lg:flex" : "flex"
        )}>
          {/* Search + tabs */}
          <div className="px-4 pt-3 pb-0 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tickets…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/40 border-0 focus-visible:ring-1"
              />
            </div>
            {/* Tab pills */}
            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
              {TABS.map(t => {
                const count = t.key === "all" ? tickets.length :
                  t.key === "open" ? tickets.filter(x => x.status === "open").length :
                  t.key === "waiting" ? tickets.filter(x => x.status.startsWith("waiting")).length :
                  t.key === "urgent" ? tickets.filter(x => x.priority === "urgent").length :
                  tickets.filter(x => x.status === "closed").length
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap",
                      tab === t.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    {t.label}
                    <span className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      tab === t.key ? "bg-white/20" : "bg-border text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs">Loading…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Inbox className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              filtered.map(t => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  active={selected?.id === t.id}
                  onClick={() => handleSelect(t)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className={cn(
          "flex-1 min-w-0 bg-background",
          showDetail && selected ? "flex flex-col" : "hidden lg:flex lg:flex-col"
        )}>
          {selected ? (
            <DetailPanel
              key={selected.id}
              ticket={selected}
              onBack={() => setShowDetail(false)}
              onRefresh={load}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground select-none">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                <MessageSquare className="h-9 w-9 opacity-40" />
              </div>
              <p className="text-sm font-medium">Select a ticket to view</p>
              <p className="text-xs mt-1 opacity-60">Pick a ticket from the list on the left</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
