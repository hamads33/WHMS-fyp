'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShoppingBag, RefreshCw, XCircle, ChevronDown, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from './status-badge'
import { ClientOrdersAPI } from '@/lib/api/orders'

const STATUS_FILTERS = ['all', 'pending', 'active', 'suspended', 'terminated', 'cancelled']

export function OrdersContent() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [spend, setSpend] = useState(null)

  function loadOrders() {
    setLoading(true)
    setError(null)
    const params = statusFilter !== 'all' ? { status: statusFilter } : {}
    Promise.all([
      ClientOrdersAPI.listOrders(params),
      ClientOrdersAPI.getSpend?.() || Promise.resolve(null),
    ])
      .then(([data, spendData]) => {
        const list = data?.orders ?? data ?? []
        setOrders(Array.isArray(list) ? list : [])
        if (spendData) setSpend(spendData)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancel(orderId) {
    if (!confirm('Cancel this order? This action cannot be undone.')) return
    setActionLoading(orderId + '-cancel')
    setActionError(null)
    try {
      await ClientOrdersAPI.cancelOrder(orderId)
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRenew(orderId) {
    setActionLoading(orderId + '-renew')
    setActionError(null)
    try {
      await ClientOrdersAPI.renewOrder(orderId)
      loadOrders()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage your service subscriptions.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/client/services">+ New Order</Link>
        </Button>
      </div>

      {spend && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Orders</p>
                  <p className="text-2xl font-bold mt-1.5">{spend.totalOrders ?? 0}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Spend</p>
                  <p className="text-2xl font-bold mt-1.5">{spend.currency || 'USD'} {Number(spend.totalSpend ?? 0).toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(error || actionError) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">{error || actionError}</p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Status:</span>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
              statusFilter === s
                ? 'bg-accent text-accent-foreground border-accent'
                : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            Orders
          </CardTitle>
          <CardDescription className="text-xs">
            {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''}${statusFilter !== 'all' ? ` · ${statusFilter}` : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="hidden md:table-cell">Plan</TableHead>
                  <TableHead className="hidden lg:table-cell">Ordered</TableHead>
                  <TableHead className="hidden lg:table-cell">Renewal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-40" />
                        <p className="text-sm text-muted-foreground">No orders found.</p>
                        <Button asChild size="sm" variant="outline">
                          <Link href="/client/services">Browse Services</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const serviceName = order.snapshot?.service?.name ?? order.serviceName ?? `Order #${order.id.slice(-8)}`
                    const planName = order.snapshot?.planData?.name ?? order.planName ?? '—'
                    const canCancel = order.status === 'pending'
                    const canRenew = order.status === 'active'
                    const isActing = actionLoading?.startsWith(order.id)
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link href={`/client/orders/${order.id}`} className="block min-w-0 hover:opacity-75 transition-opacity">
                            <p className="text-sm font-medium truncate max-w-[160px]">{serviceName}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">{order.id.slice(-12)}</p>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{planName}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(order.nextRenewalAt)}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" disabled={isActing}>
                                Actions <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/client/orders/${order.id}`} className="text-xs">View Details</Link>
                              </DropdownMenuItem>
                              {canRenew && (
                                <DropdownMenuItem
                                  className="text-xs gap-2"
                                  onClick={() => handleRenew(order.id)}
                                  disabled={isActing}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Renew Order
                                </DropdownMenuItem>
                              )}
                              {canCancel && (
                                <DropdownMenuItem
                                  className="text-xs gap-2 text-destructive focus:text-destructive"
                                  onClick={() => handleCancel(order.id)}
                                  disabled={isActing}
                                >
                                  <XCircle className="h-3 w-3" />
                                  Cancel Order
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
