'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Plus, Eye, Clock, AlertCircle, RefreshCw,
  Inbox, CheckCircle, MessageSquare, ChevronRight, Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ClientSupportAPI } from '@/lib/api/support'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(d) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STATUS_MAP = {
  open:               { label: 'Open',           dot: 'bg-accent', text: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  waiting_for_staff:  { label: 'Waiting',        dot: 'bg-muted-foreground',  text: 'text-muted-foreground',  bg: 'bg-muted/50 border-border' },
  waiting_for_client: { label: 'Your Turn',      dot: 'bg-muted-foreground',   text: 'text-muted-foreground',   bg: 'bg-muted/50 border-border' },
  on_hold:            { label: 'On Hold',        dot: 'bg-muted-foreground',  text: 'text-muted-foreground',  bg: 'bg-muted/50 border-border' },
  closed:             { label: 'Closed',         dot: 'bg-muted-foreground',   text: 'text-muted-foreground',   bg: 'bg-muted/50 border-border' },
}

const PRIORITY_MAP = {
  low:    { label: 'Low',    color: 'text-muted-foreground' },
  medium: { label: 'Medium', color: 'text-foreground' },
  high:   { label: 'High',   color: 'text-destructive' },
  urgent: { label: 'Urgent', color: 'text-destructive' },
}

function StatusChip({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', s.bg, s.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
      {s.label}
    </span>
  )
}

// ── New Ticket Modal ──────────────────────────────────────────────────────────

function NewTicketModal({ open, onClose, onCreated }) {
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ subject: '', departmentId: '', body: '', priority: 'medium' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    ClientSupportAPI.listDepartments()
      .then(res => setDepartments(res?.data ?? res ?? []))
      .catch(() => {})
  }, [open])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.body.trim()) { setError('Subject and message are required.'); return }
    if (!form.departmentId) { setError('Please select a department.'); return }
    setSubmitting(true); setError(null)
    try {
      const res = await ClientSupportAPI.createTicket(form)
      onCreated(res?.ticket ?? res?.data ?? res)
      onClose()
      setForm({ subject: '', departmentId: '', body: '', priority: 'medium' })
    } catch (err) {
      setError(err.message || 'Failed to submit ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Open a Support Ticket</DialogTitle>
          <DialogDescription className="text-xs">We'll get back to you as soon as possible.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</Label>
            <Input value={form.subject} onChange={e => set('subject', e.target.value)}
              placeholder="Brief summary of your issue" className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</Label>
              <Select value={form.departmentId} onValueChange={v => set('departmentId', v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {departments.length === 0
                    ? <div className="px-3 py-2 text-xs text-muted-foreground">Loading departments…</div>
                    : departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Message</Label>
            <Textarea value={form.body} onChange={e => set('body', e.target.value)}
              placeholder="Describe your issue in detail…" rows={5} className="resize-none text-sm" />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs">
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Ticket Card ───────────────────────────────────────────────────────────────

function TicketCard({ ticket }) {
  const p = PRIORITY_MAP[ticket.priority] ?? {}
  const replies = ticket._count?.replies ?? ticket.replies?.length ?? 0
  return (
    <Link href={`/client/support/${ticket.id}`} className="group block">
      <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] text-muted-foreground">{ticket.ticketNumber}</span>
              <StatusChip status={ticket.status} />
              <span className={cn('text-xs font-medium', p.color)}>{p.label}</span>
            </div>
            <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {ticket.subject}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {ticket.department?.name && (
                <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{ticket.department.name}</span>
              )}
              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{replies} {replies === 1 ? 'reply' : 'replies'}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(ticket.updatedAt ?? ticket.createdAt)}</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors mt-1" />
        </div>
      </div>
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SupportContent() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('all')

  function load() {
    setLoading(true); setError(null)
    ClientSupportAPI.listTickets()
      .then(res => setTickets(res?.rows ?? res?.data ?? res?.tickets ?? []))
      .catch(err => setError(err.message || 'Failed to load tickets.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = tickets.filter(t => {
    if (filter === 'open') return t.status !== 'closed'
    if (filter === 'closed') return t.status === 'closed'
    return true
  })

  const openCount   = tickets.filter(t => t.status !== 'closed').length
  const closedCount = tickets.filter(t => t.status === 'closed').length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your support requests and get help from our team.</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs shrink-0" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5" />New Ticket
        </Button>
      </div>

      <NewTicketModal open={showNew} onClose={() => setShowNew(false)} onCreated={t => { if (t) setTickets(p => [t, ...p]); else load() }} />

      {/* Quick stats */}
      {!loading && tickets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: tickets.length, icon: Inbox, color: 'bg-accent/10 text-accent' },
            { label: 'Open', value: openCount, icon: MessageSquare, color: 'bg-accent/10 text-accent' },
            { label: 'Closed', value: closedCount, icon: CheckCircle, color: 'bg-muted text-muted-foreground' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', color)}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {tickets.length > 0 && (
        <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
          {[['all','All'], ['open','Open'], ['closed','Closed']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                filter === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /><span className="text-sm">Loading…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 py-12 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={load} className="h-7 text-xs">Retry</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-semibold">No tickets yet</p>
            <p className="text-xs text-muted-foreground mt-1">Our support team is ready to help you.</p>
          </div>
          <Button size="sm" className="gap-1.5 h-8 text-xs mt-1" onClick={() => setShowNew(true)}>
            <Plus className="h-3.5 w-3.5" />Open a Ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(t => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}
    </div>
  )
}
