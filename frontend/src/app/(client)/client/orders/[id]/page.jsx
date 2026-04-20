'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Package, Clock,
  RefreshCw, XCircle, CheckCircle2, AlertTriangle,
  Server, List, Zap, ShieldCheck, ShieldOff, CreditCard,
  Eye, EyeOff, Copy, HardDrive, Wifi, Database, Mail,
  Globe, ExternalLink, Headphones, PlayCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ClientOrdersAPI } from '@/lib/api/orders'
import { ClientSupportAPI } from '@/lib/api/support'
import { apiFetch } from '@/lib/api/client'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtDT(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function fmtMoney(amount, currency = 'USD') {
  if (amount == null || amount === '') return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

const STATUS_CONFIG = {
  active:      { label: 'Active',      bg: 'bg-green-500',  ring: 'ring-green-500/20',  text: 'text-green-700',  light: 'bg-green-50 dark:bg-green-950/40'  },
  pending:     { label: 'Pending',     bg: 'bg-amber-500',  ring: 'ring-amber-500/20',  text: 'text-amber-700',  light: 'bg-amber-50 dark:bg-amber-950/40'  },
  suspended:   { label: 'Suspended',   bg: 'bg-orange-500', ring: 'ring-orange-500/20', text: 'text-orange-700', light: 'bg-orange-50 dark:bg-orange-950/40' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-slate-400',  ring: 'ring-slate-400/20',  text: 'text-slate-600',  light: 'bg-slate-50 dark:bg-slate-900/40'  },
  terminated:  { label: 'Terminated',  bg: 'bg-red-500',    ring: 'ring-red-500/20',    text: 'text-red-700',    light: 'bg-red-50 dark:bg-red-950/40'      },
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${cfg.text} ${cfg.light} ${cfg.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.bg}`} />
      {cfg.label}
    </span>
  )
}

function DataRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right truncate max-w-[65%] ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function TimelineDot({ variant }) {
  const colors = {
    default: 'border-border bg-background',
    success: 'border-green-500 bg-green-500',
    warning: 'border-amber-500 bg-amber-500',
    danger:  'border-red-500 bg-red-500',
    future:  'border-primary bg-background',
  }
  return (
    <div className={`h-3 w-3 rounded-full border-2 shrink-0 z-10 ${colors[variant] ?? colors.default}`} />
  )
}

function TimelineItem({ label, date, variant = 'default', last = false }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <TimelineDot variant={variant} />
        {!last && <div className="w-0.5 flex-1 bg-border/60 mt-1" />}
      </div>
      <div className={`flex-1 flex items-start justify-between gap-4 ${last ? 'pb-0' : 'pb-5'}`}>
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{fmtDT(date)}</span>
      </div>
    </div>
  )
}

function UsageBar({ used, total, unit = 'MB' }) {
  if (!total) return <span className="text-xs text-muted-foreground">—</span>
  const pct = Math.min(100, Math.round(((used ?? 0) / total) * 100))
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{(used ?? 0).toFixed ? (used ?? 0).toFixed(1) : used ?? 0} / {total} {unit}</span>
        <span className={pct > 80 ? 'text-red-600 font-semibold dark:text-red-400' : 'text-muted-foreground'}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SSLBadge({ ssl }) {
  if (!ssl || ssl.status === 'inactive' || ssl.status === 'none') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
        <ShieldOff className="h-2.5 w-2.5" /> No SSL
      </span>
    )
  }
  const expiry = ssl.expiryDate ? new Date(ssl.expiryDate) : null
  const daysLeft = expiry ? Math.ceil((expiry - Date.now()) / 86400000) : null
  const color = daysLeft !== null && daysLeft < 7 ? 'red' : daysLeft !== null && daysLeft < 30 ? 'amber' : 'green'
  const cls = { green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900', amber: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900', red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900' }[color]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>
      <ShieldCheck className="h-2.5 w-2.5" />
      {daysLeft !== null ? `${daysLeft}d left` : 'SSL Active'}
    </span>
  )
}

function CredentialRow({ label, value, masked = true }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const display = masked && !revealed ? '•'.repeat(12) : (value ?? '—')

  async function copy() {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0 gap-3">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className="font-mono text-xs truncate">{display}</span>
        {masked && (
          <button onClick={() => setRevealed(r => !r)} className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded">
            {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        )}
        {value && (
          <button onClick={copy} className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded">
            {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  )
}

function HostingDetailsSection({ orderId, orderStatus, serviceName }) {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ticketSent, setTicketSent] = useState(false)
  const [ticketLoading, setTicketLoading] = useState(null)

  useEffect(() => {
    apiFetch(`/client/provisioning/accounts/order/${orderId}`)
      .then(data => setAccount(data?.account ?? data))
      .catch(() => setAccount(null))
      .finally(() => setLoading(false))
  }, [orderId])

  async function openTicket(subject, body) {
    setTicketLoading(subject)
    try {
      await ClientSupportAPI.createTicket({ subject, body, priority: 'medium' })
      setTicketSent(true)
      setTimeout(() => setTicketSent(false), 4000)
    } catch { /* silent */ }
    finally { setTicketLoading(null) }
  }

  if (loading) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
            <Globe className="h-4 w-4" /> Hosting Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-muted rounded w-3/4" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!account) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
            <Globe className="h-4 w-4" /> Hosting Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Server className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Not yet provisioned</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your hosting account is being set up. Check back soon.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5"
              onClick={() => openTicket(`Provisioning Status - Order #${orderId}`, `Hi, I would like to check the status of my hosting provisioning for order #${orderId} (${serviceName}).`)}>
              <Headphones className="h-3.5 w-3.5" /> Ask Support
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const domains = account.domains ?? []
  const databases = account.databases ?? []
  const emails = account.emails ?? []

  return (
    <div className="space-y-4">
      {ticketSent && (
        <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/40 dark:border-green-800 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">Support ticket submitted successfully.</p>
        </div>
      )}

      {/* Account Overview */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
            <Globe className="h-4 w-4" /> Hosting Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-0">
              <DataRow label="Username"    value={account.username} mono />
              <DataRow label="Main Domain" value={account.domain ?? account.mainDomain} />
              <DataRow label="Status"      value={
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border
                  ${account.status === 'active'
                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900'
                    : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${account.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  {account.status === 'active' ? 'Active' : 'Suspended'}
                </span>
              } />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <HardDrive className="h-3 w-3" /> Disk Usage
                </p>
                <UsageBar used={account.diskUsed ?? account.diskUsage} total={account.diskLimit ?? account.diskQuota} unit="MB" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> Bandwidth
                </p>
                <UsageBar used={account.bandwidthUsed ?? account.bandwidthUsage} total={account.bandwidthLimit ?? account.bandwidthQuota} unit="GB" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domains & SSL */}
      {domains.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Globe className="h-4 w-4" /> Domains & SSL
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {domains.map((d, i) => {
                const name = typeof d === 'string' ? d : (d.domain ?? d.name)
                const ssl = typeof d === 'object' ? d.ssl ?? d : null
                return (
                  <div key={i} className="flex items-center justify-between px-6 py-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SSLBadge ssl={ssl} />
                      {name && (
                        <a href={`https://${name}`} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Databases */}
      {databases.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Database className="h-4 w-4" /> Databases
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {databases.map((db, i) => (
                <div key={i} className="px-6 py-3">
                  <p className="text-sm font-medium mb-1">{db.name ?? db.dbName ?? `Database ${i + 1}`}</p>
                  <CredentialRow label="DB Name"  value={db.name ?? db.dbName} masked={false} />
                  <CredentialRow label="Username" value={db.user ?? db.username} masked={false} />
                  <CredentialRow label="Password" value={db.password} masked />
                  {db.host && <CredentialRow label="Host" value={db.host} masked={false} />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Accounts */}
      {emails.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Mail className="h-4 w-4" /> Email Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {emails.map((em, i) => (
                <div key={i} className="px-6 py-3">
                  <p className="text-sm font-medium mb-1">{em.email ?? em.address ?? `Email ${i + 1}`}</p>
                  <CredentialRow label="Address"  value={em.email ?? em.address} masked={false} />
                  <CredentialRow label="Password" value={em.password} masked />
                  {em.quota && <CredentialRow label="Quota" value={`${em.quota} MB`} masked={false} />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
            <Zap className="h-4 w-4" /> Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5"
              onClick={() => openTicket(
                `Support Request - Order #${orderId}`,
                `Hi, I need help with my hosting service (Order #${orderId} - ${serviceName}).`
              )}
              disabled={!!ticketLoading}>
              <Headphones className="h-3.5 w-3.5" /> Request Support
            </Button>
            {orderStatus === 'suspended' && (
              <Button size="sm" variant="outline" className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/40"
                onClick={() => openTicket(
                  `Reactivation Request - Order #${orderId}`,
                  `Hi, I would like to request reactivation of my suspended hosting account for Order #${orderId} (${serviceName}).`
                )}
                disabled={!!ticketLoading}>
                <PlayCircle className="h-3.5 w-3.5" /> Request Reactivation
              </Button>
            )}
            {account.fileManagerUrl && (
              <Button size="sm" variant="outline" asChild className="gap-1.5">
                <a href={account.fileManagerUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> File Manager
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)

  useEffect(() => {
    ClientOrdersAPI.getOrderDetails(id)
      .then((data) => setOrder(data?.order ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    if (!confirm('Cancel this order? This cannot be undone.')) return
    setActionLoading('cancel')
    try {
      await ClientOrdersAPI.cancelOrder(id)
      setOrder((prev) => ({ ...prev, status: 'cancelled', cancelledAt: new Date().toISOString() }))
      setActionMsg('Order cancelled successfully.')
    } catch (e) { setError(e.message) }
    finally { setActionLoading(null) }
  }

  async function handleRenew() {
    setActionLoading('renew')
    try {
      const res = await ClientOrdersAPI.renewOrder(id)
      setOrder((prev) => ({ ...prev, nextRenewalAt: res.nextRenewalAt ?? prev.nextRenewalAt }))
      setActionMsg('Order renewed successfully.')
    } catch (e) { setError(e.message) }
    finally { setActionLoading(null) }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-28 bg-muted rounded" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/client/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (!order) return null

  const snapshot = order.snapshot ?? {}
  const service = snapshot.service ?? {}
  const planData = snapshot.planData ?? {}
  const pricing = snapshot.pricing ?? {}
  const costBreakdown = order.costBreakdown ?? {}
  const features = snapshot.features ?? {}
  const addons = snapshot.addons ?? []
  const currency = pricing.currency ?? 'USD'

  const canCancel = order.status === 'pending'
  const canRenew  = order.status === 'active'
  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending

  const timelineItems = [
    { label: 'Order placed',  date: order.createdAt,    variant: 'success' },
    order.startedAt    && { label: 'Activated',         date: order.startedAt,    variant: 'success' },
    order.suspendedAt  && { label: 'Suspended',         date: order.suspendedAt,  variant: 'warning' },
    order.nextRenewalAt && order.status === 'active' && { label: 'Next renewal',  date: order.nextRenewalAt, variant: 'future' },
    order.terminatedAt && { label: 'Terminated',        date: order.terminatedAt, variant: 'danger'  },
    order.cancelledAt  && { label: 'Cancelled',         date: order.cancelledAt,  variant: 'danger'  },
  ].filter(Boolean)

  const total = costBreakdown.total ?? pricing.price

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link href="/client/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      {/* Hero Header */}
      <div className={`rounded-2xl border p-6 ${statusCfg.light}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Server className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{service.name ?? 'Order Details'}</h1>
              {planData.name && (
                <p className="text-sm text-muted-foreground mt-0.5">{planData.name}</p>
              )}
              <p className="text-xs text-muted-foreground font-mono mt-1 opacity-60">{order.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusPill status={order.status} />
            {canRenew && (
              <Button size="sm" variant="outline" onClick={handleRenew} disabled={!!actionLoading} className="gap-1.5 h-8">
                <RefreshCw className="h-3.5 w-3.5" /> Renew
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={!!actionLoading}
                className="gap-1.5 h-8 text-destructive border-destructive/30 hover:bg-destructive/10">
                <XCircle className="h-3.5 w-3.5" /> Cancel Order
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {actionMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/40 dark:border-green-800 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">{actionMsg}</p>
        </div>
      )}
      {order.status === 'suspended' && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            This order is currently suspended. Please contact support to reactivate it.
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Service & Plan — spans 2 cols */}
        <Card className="lg:col-span-2 rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Server className="h-4 w-4" /> Service & Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow label="Service"       value={service.name} />
            <DataRow label="Service Code"  value={service.code} mono />
            <DataRow label="Plan"          value={planData.name} />
            {planData.summary && <DataRow label="Plan Summary" value={planData.summary} />}
            <DataRow label="Billing Cycle" value={pricing.cycle?.replace(/_/g, ' ')} />
            <DataRow label="Currency"      value={currency} />
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <CreditCard className="h-4 w-4" /> Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow label="Base Price" value={fmtMoney(pricing.price, currency)} />
            {costBreakdown.setupCost && Number(costBreakdown.setupCost) > 0 && (
              <DataRow label="Setup Fee" value={fmtMoney(costBreakdown.setupCost, currency)} />
            )}
            {costBreakdown.addonCost && Number(costBreakdown.addonCost) > 0 && (
              <DataRow label="Add-ons" value={fmtMoney(costBreakdown.addonCost, currency)} />
            )}
            {costBreakdown.discountAmount && Number(costBreakdown.discountAmount) > 0 && (
              <DataRow label="Discount" value={`− ${fmtMoney(costBreakdown.discountAmount, currency)}`} />
            )}
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-xl font-extrabold text-primary tabular-nums">
                {fmtMoney(total, currency)}
              </span>
            </div>

            {/* Trust badges */}
            <div className="mt-4 space-y-1.5">
              {[
                { icon: ShieldCheck, text: '30-day money-back guarantee' },
                { icon: Zap,         text: 'Instant activation on payment' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary/70" /> {text}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hosting Details — shown for active and suspended orders */}
      {(order.status === 'active' || order.status === 'suspended') && (
        <HostingDetailsSection
          orderId={order.id}
          orderStatus={order.status}
          serviceName={service.name ?? 'Hosting Service'}
        />
      )}

      {/* Add-ons */}
      {addons.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Package className="h-4 w-4" /> Add-ons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {addons.map((addon, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{addon.name}</p>
                    {addon.code && <p className="text-xs text-muted-foreground font-mono">{addon.code}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{fmtMoney(addon.price ?? 0, addon.currency ?? currency)}</p>
                    {addon.quantity > 1 && <p className="text-xs text-muted-foreground">× {addon.quantity}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      {Object.keys(features).length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <List className="h-4 w-4" /> Included Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(features).map(([key, feat]) => (
                <div key={key} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">{feat.name ?? key}</span>
                  <span className="text-sm font-semibold ml-2 shrink-0">
                    {feat.value}{feat.unit ? ` ${feat.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
            <Clock className="h-4 w-4" /> Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pt-1">
            {timelineItems.map((item, i) => (
              <TimelineItem
                key={i}
                label={item.label}
                date={item.date}
                variant={item.variant}
                last={i === timelineItems.length - 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
