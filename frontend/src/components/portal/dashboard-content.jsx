'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import {
  Server, CreditCard, LifeBuoy, ArrowRight,
  ShoppingBag, AlertTriangle, FileText, PackageOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './status-badge'
import { ClientBillingAPI } from '@/lib/api/billing'
import { ClientOrdersAPI } from '@/lib/api/orders'

// ── Skeleton helpers ────────────────────────────────────────────────────────

function SkeletonLine({ className = "" }) {
  return <div className={`h-3 rounded bg-muted animate-pulse ${className}`} />
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ title, value, subtitle, icon: Icon, href, alert }) {
  return (
    <Link href={href} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card className={`transition-all duration-150 group-hover:border-accent/40 group-hover:shadow-sm ${alert ? 'border-destructive/30' : ''}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
              <p className={`text-3xl font-bold mt-1.5 tabular-nums leading-none ${alert ? 'text-destructive' : 'text-foreground'}`}>
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className={`rounded-xl p-2.5 shrink-0 ${alert ? 'bg-destructive/10' : 'bg-muted'}`}>
              <Icon className={`h-5 w-5 ${alert ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-accent transition-colors">
            <span>View all</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <SkeletonLine className="w-24" />
            <SkeletonLine className="w-12 h-6" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse shrink-0" />
        </div>
        <SkeletonLine className="w-16" />
      </CardContent>
    </Card>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>}
      {action && (
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function DashboardContent() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, invoicesData, ordersData] = await Promise.allSettled([
          ClientBillingAPI.getSummary(),
          ClientBillingAPI.listInvoices({ limit: 4 }),
          ClientOrdersAPI.listOrders({ limit: 6 }),
        ])
        if (summaryData.status === 'fulfilled') setSummary(summaryData.value)
        if (invoicesData.status === 'fulfilled') {
          const list = invoicesData.value?.invoices ?? invoicesData.value ?? []
          setInvoices(Array.isArray(list) ? list.slice(0, 4) : [])
        }
        if (ordersData.status === 'fulfilled') {
          const list = ordersData.value?.orders ?? ordersData.value ?? []
          setOrders(Array.isArray(list) ? list : [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeOrders   = orders.filter(o => o.status?.toLowerCase() === 'active').length
  const unpaidInvoices = invoices.filter(i => ['unpaid', 'overdue'].includes(i.status?.toLowerCase())).length

  const statCards = [
    {
      title:    'Active Services',
      value:    loading ? '—' : activeOrders,
      subtitle: loading ? null : `${orders.length} total order${orders.length !== 1 ? 's' : ''}`,
      icon:     Server,
      href:     '/client/services',
    },
    {
      title:    'Total Orders',
      value:    loading ? '—' : orders.length,
      subtitle: loading ? null : (activeOrders > 0 ? `${activeOrders} active` : 'None active'),
      icon:     ShoppingBag,
      href:     '/client/orders',
    },
    {
      title:    'Unpaid Invoices',
      value:    loading ? '—' : unpaidInvoices,
      subtitle: loading ? null : (unpaidInvoices > 0 ? 'Requires attention' : 'All paid'),
      icon:     CreditCard,
      href:     '/client/billing',
      alert:    !loading && unpaidInvoices > 0,
    },
    {
      title:    'Support Tickets',
      value:    '—',
      subtitle: 'Coming soon',
      icon:     LifeBuoy,
      href:     '/client/support',
    },
  ]

  function formatAmount(inv) {
    const amt = inv.totalAmount != null ? Number(inv.totalAmount) : null
    if (amt == null) return inv.amount ?? '—'
    const curr = inv.currency ?? ''
    return `${curr}${amt.toFixed(2)}`
  }

  function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.name ? `Welcome back, ${user.name}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Unpaid invoice alert */}
      {!loading && unpaidInvoices > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">
              You have {unpaidInvoices} unpaid invoice{unpaidInvoices > 1 ? 's' : ''} outstanding.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild className="shrink-0">
            <Link href="/client/billing">Pay now</Link>
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map(card => <StatCard key={card.title} {...card} />)
        }
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Recent invoices */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
              <CardDescription className="text-xs mt-0.5">Your latest billing activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-8 -mr-2">
              <Link href="/client/billing">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4">
                    <div className="space-y-2 flex-1">
                      <SkeletonLine className="w-32" />
                      <SkeletonLine className="w-20" />
                    </div>
                    <div className="flex items-center gap-3">
                      <SkeletonLine className="w-16 h-5" />
                      <SkeletonLine className="w-14" />
                    </div>
                  </div>
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Your billing history will appear here once you have active services."
                action={{ href: '/client/services', label: 'Browse services' }}
              />
            ) : (
              <div className="divide-y divide-border">
                {invoices.map(inv => (
                  <Link key={inv.id} href={`/client/billing/${inv.id}`} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium font-mono truncate">{inv.invoiceNumber ?? inv.id}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.issuedAt ?? inv.date)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={inv.status} />
                        <span className="text-sm font-semibold tabular-nums">{formatAmount(inv)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Billing Summary</CardTitle>
              <CardDescription className="text-xs mt-0.5">Account overview</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <SkeletonLine className="w-24" />
                    <SkeletonLine className="w-16" />
                  </div>
                ))}
              </div>
            ) : summary ? (
              <div className="divide-y divide-border">
                {[
                  { label: 'Total Invoiced',  value: summary.totalInvoiced ?? summary.totalBilled },
                  { label: 'Total Paid',       value: summary.totalPaid },
                  { label: 'Outstanding',      value: summary.outstanding ?? summary.unpaidAmount },
                  { label: 'Currency',         value: summary.currency ?? 'USD', isText: true },
                ].map(({ label, value, isText }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {value == null
                        ? '—'
                        : isText
                          ? value
                          : typeof value === 'number' ? value.toFixed(2) : value
                      }
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No billing data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Service Orders</CardTitle>
            <CardDescription className="text-xs mt-0.5">Status of your service subscriptions</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs h-8 -mr-2">
            <Link href="/client/services">Browse services</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine className="w-48" />
                    <SkeletonLine className="w-28" />
                  </div>
                  <SkeletonLine className="w-16 h-5" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="No orders yet"
              description="Place your first order to get started with our services."
              action={{ href: '/client/services', label: 'Browse services' }}
            />
          ) : (
            <div className="divide-y divide-border">
              {orders.map(order => {
                const serviceName = order.snapshot?.service?.name ?? order.serviceName ?? `Order #${order.id}`
                const planName    = order.snapshot?.planData?.name ?? order.planName ?? ''
                return (
                  <div key={order.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Server className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{serviceName}</p>
                      {planName && <p className="text-xs text-muted-foreground truncate">{planName}</p>}
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
