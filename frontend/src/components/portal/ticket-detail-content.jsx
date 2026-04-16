'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowLeft, Send, User, Headphones, RefreshCw, AlertCircle,
  Lock, LockOpen, Tag, Clock, MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ClientSupportAPI } from '@/lib/api/support'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFull(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return fmtFull(d)
}

const STATUS_MAP = {
  open:               { label: 'Open',        dot: 'bg-accent', text: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  waiting_for_staff:  { label: 'Waiting',     dot: 'bg-muted-foreground',  text: 'text-muted-foreground',  bg: 'bg-muted/50 border-border' },
  waiting_for_client: { label: 'Your Turn',   dot: 'bg-muted-foreground',   text: 'text-muted-foreground',   bg: 'bg-muted/50 border-border' },
  on_hold:            { label: 'On Hold',     dot: 'bg-muted-foreground',  text: 'text-muted-foreground',  bg: 'bg-muted/50 border-border' },
  closed:             { label: 'Closed',      dot: 'bg-muted-foreground',   text: 'text-muted-foreground',   bg: 'bg-muted/50 border-border' },
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

// ── Message Bubble ────────────────────────────────────────────────────────────

function Bubble({ reply, clientId }) {
  const isClient = reply.authorId === clientId || reply.isClient
  return (
    <div className={cn('flex gap-3', isClient ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        isClient ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {isClient ? <User className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 max-w-[78%]', isClient ? 'items-end' : 'items-start')}>
        <div className={cn('flex items-center gap-2', isClient ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs font-semibold">
            {isClient ? 'You' : (reply.author?.email?.split('@')[0] ?? 'Support')}
          </span>
          <span className="text-[11px] text-muted-foreground">{timeAgo(reply.createdAt)}</span>
        </div>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isClient
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-muted text-foreground rounded-tl-none'
        )}>
          {reply.body}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TicketDetailContent({ ticketId }) {
  const [ticket, setTicket]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [reply, setReply]         = useState('')
  const [sending, setSending]     = useState(false)
  const [sendError, setSendError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  function load() {
    setLoading(true); setError(null)
    ClientSupportAPI.getTicket(ticketId)
      .then(res => {
        const t = res?.ticket ?? res?.data ?? res
        if (t?.replies) {
          t.replies = t.replies.map(r => ({ ...r, isClient: r.authorId === t.clientId }))
        }
        setTicket(t)
      })
      .catch(err => setError(err.message || 'Ticket not found.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (ticketId) load() }, [ticketId])

  async function handleSend() {
    if (!reply.trim()) return
    setSending(true); setSendError(null)
    try {
      await ClientSupportAPI.addReply(ticketId, reply.trim())
      setReply('')
      load()
    } catch (err) {
      setSendError(err.message || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  async function handleClose() {
    setActionLoading('close')
    try { await ClientSupportAPI.closeTicket(ticketId); setTicket(p => ({ ...p, status: 'closed' })) } catch {}
    setActionLoading(null)
  }

  async function handleReopen() {
    setActionLoading('reopen')
    try { await ClientSupportAPI.reopenTicket(ticketId); setTicket(p => ({ ...p, status: 'open' })) } catch {}
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/client/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Back
        </Link>
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /><span className="text-sm">Loading ticket…</span>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/client/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Back
        </Link>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/30 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{error ?? 'Ticket not found.'}</p>
          <Button variant="outline" size="sm" onClick={load} className="h-7 text-xs">Retry</Button>
        </div>
      </div>
    )
  }

  const isClosed = ticket.status === 'closed'
  const p = PRIORITY_MAP[ticket.priority] ?? {}
  const publicReplies = (ticket.replies ?? []).filter(r => r.type !== 'internal')

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <Link href="/client/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />All Tickets
      </Link>

      {/* Ticket header card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
              <StatusChip status={ticket.status} />
              <span className={cn('text-xs font-medium', p.color)}>{p.label} Priority</span>
            </div>
            <h1 className="text-lg font-bold leading-snug">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
              {ticket.department?.name && (
                <span className="flex items-center gap-1.5"><Tag className="h-3 w-3" />{ticket.department.name}</span>
              )}
              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />Opened {fmtFull(ticket.createdAt)}</span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />{publicReplies.length} {publicReplies.length === 1 ? 'reply' : 'replies'}
              </span>
            </div>
          </div>
          {!isClosed ? (
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-8 text-xs"
              onClick={handleClose} disabled={!!actionLoading}>
              <Lock className="h-3 w-3" />{actionLoading === 'close' ? 'Closing…' : 'Close Ticket'}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-8 text-xs"
              onClick={handleReopen} disabled={!!actionLoading}>
              <LockOpen className="h-3 w-3" />{actionLoading === 'reopen' ? 'Reopening…' : 'Reopen'}
            </Button>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold">Conversation</p>
        </div>
        <div className="p-5 space-y-6">
          {publicReplies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Add a reply below.</p>
          ) : (
            publicReplies.map(r => <Bubble key={r.id} reply={r} clientId={ticket.clientId} />)
          )}
        </div>
      </div>

      {/* Reply */}
      {!isClosed && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-sm font-semibold">Your Reply</p>
          </div>
          <div className="p-5 space-y-3">
            <Textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Type your message…"
              rows={4}
              className="resize-none text-sm bg-muted/30 border-0 focus-visible:ring-1"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend() }}
            />
            {sendError && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />{sendError}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">⌘ + Enter to send</p>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={handleSend}
                disabled={!reply.trim() || sending}>
                <Send className="h-3.5 w-3.5" />{sending ? 'Sending…' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            This ticket is closed.{' '}
            <button onClick={handleReopen} disabled={!!actionLoading}
              className="text-primary hover:underline underline-offset-2 disabled:opacity-50">
              Reopen it
            </button>{' '}
            or{' '}
            <Link href="/client/support" className="text-primary hover:underline underline-offset-2">
              open a new ticket
            </Link>.
          </p>
        </div>
      )}
    </div>
  )
}
