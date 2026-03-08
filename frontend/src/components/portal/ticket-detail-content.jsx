'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Send, Paperclip, User, Headphones } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './status-badge'
import { cn } from '@/lib/utils'

function MessageBubble({ message }) {
  const isClient = message.from === 'client'
  return (
    <div className={cn('flex gap-3', isClient ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        isClient ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {isClient ? <User className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
      </div>
      <div className={cn('flex-1 max-w-xl', isClient ? 'items-end' : 'items-start')}>
        <div className={cn(
          'flex items-center gap-2 mb-1.5',
          isClient ? 'flex-row-reverse' : 'flex-row'
        )}>
          <span className="text-xs font-semibold">{message.name}</span>
          <span className="text-xs text-muted-foreground">{message.time}</span>
        </div>
        <div className={cn(
          'rounded-xl px-4 py-3 text-sm leading-relaxed',
          isClient
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}>
          {message.body}
        </div>
      </div>
    </div>
  )
}

export function TicketDetailContent({ ticket }) {
  const [messages, setMessages] = useState(ticket.messages)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = () => {
    if (!reply.trim()) return
    setSending(true)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          from: 'client',
          name: 'Alex Johnson',
          time: new Date().toLocaleString(),
          body: reply.trim(),
        },
      ])
      setReply('')
      setSending(false)
    }, 600)
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 mt-0.5">
          <Link href="/support"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{ticket.id}</span>
            <StatusBadge status={ticket.status} />
            <StatusBadge status={ticket.priority} />
          </div>
          <h1 className="text-xl font-semibold mt-1 text-balance">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{ticket.department} &mdash; Opened {ticket.created}</p>
        </div>
      </div>

      {/* Conversation */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reply box */}
      {ticket.status !== 'Closed' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Type your reply here..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                <Paperclip className="h-3.5 w-3.5" />
                Attach File
              </Button>
              <Button
                size="sm"
                className="gap-2 h-8 text-xs"
                onClick={handleSend}
                disabled={!reply.trim() || sending}
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {ticket.status === 'Closed' && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">This ticket is closed. <button className="text-primary underline-offset-4 hover:underline">Open a new ticket</button> if you need further assistance.</p>
        </div>
      )}
    </div>
  )
}
