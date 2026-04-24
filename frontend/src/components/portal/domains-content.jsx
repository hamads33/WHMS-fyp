'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Globe, Settings, Loader2, AlertCircle, RefreshCw,
  Clock, CheckCircle2, XCircle, AlertTriangle, Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getDomains, formatDate, daysUntilExpiry } from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'
import { useAuth } from '@/lib/context/AuthContext'

/* ── helpers ────────────────────────────────────────────── */
const STATUS_CONFIG = {
  active:               { label: 'Active',           icon: CheckCircle2, classes: 'bg-accent/10 text-foreground border-accent/20' },
  expired:              { label: 'Expired',          icon: XCircle,      classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  grace:                { label: 'Grace Period',     icon: AlertTriangle, classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  transfer_pending:     { label: 'Transfer Pending', icon: Clock,         classes: 'bg-muted text-foreground border-border' },
  pending_registration: { label: 'Pending',          icon: Clock,         classes: 'bg-muted text-foreground border-border' },
  cancelled:            { label: 'Cancelled',        icon: XCircle,       classes: 'bg-muted text-muted-foreground border-border' },
}

function DomainStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-500/10 text-gray-600 border-gray-500/20' }
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </Badge>
  )
}

function ExpiryIndicator({ expiryDate }) {
  const days = daysUntilExpiry(expiryDate)
  if (days === null) return null
  if (days < 0) return (
    <span className="flex items-center gap-1 text-xs text-destructive font-medium">
      <XCircle className="h-3 w-3" /> Expired {Math.abs(days)}d ago
    </span>
  )
  if (days <= 14) return (
    <span className="flex items-center gap-1 text-xs text-destructive font-medium">
      <AlertTriangle className="h-3 w-3" /> {days}d left
    </span>
  )
  if (days <= 30) return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
      <Clock className="h-3 w-3" /> {days}d left
    </span>
  )
  return <span className="text-xs text-muted-foreground">{formatDate(expiryDate)}</span>
}

/* ── component ──────────────────────────────────────────── */
export function DomainsContent() {
  const { user } = useAuth()
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchDomains = async () => {
    try {
      setLoading(true); setError(null)
      const res = await getDomains({ ownerId: user?.id })
      setDomains(Array.isArray(res?.data) ? res.data : [])
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDomains() }, [user?.id])

  // domains expiring within 30 days
  const expiringSoon = domains.filter(d => {
    const days = daysUntilExpiry(d.expiryDate)
    return days !== null && days >= 0 && days <= 30 && d.status === 'active'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Domains</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your registered domains and DNS settings.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={fetchDomains} disabled={loading} className="gap-1.5 h-8 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" asChild className="gap-1.5 h-8 text-xs">
            <Link href="/client/domains/register">
              <Plus className="h-3.5 w-3.5" />
              Register Domain
            </Link>
          </Button>
        </div>
      </div>

      {/* Expiry warning banner */}
      {expiringSoon.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                {expiringSoon.length} domain{expiringSoon.length !== 1 ? 's' : ''} expiring within 30 days
              </p>
              <p className="text-xs text-destructive/80 mt-0.5">
                {expiringSoon.map(d => d.name).join(', ')} — consider renewing soon.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="py-3 px-4 flex gap-3 items-start">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Domains card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Your Domains</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {loading ? 'Loading…' : `${domains.length} domain${domains.length !== 1 ? 's' : ''} registered`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Globe className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">No domains yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                You have not registered any domains yet.
              </p>
              <Button size="sm" asChild className="mt-3 gap-1.5">
                <Link href="/client/domains/register">
                  <Plus className="h-3.5 w-3.5" />
                  Register your first domain
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Expiry</TableHead>
                    <TableHead className="hidden md:table-cell">Registrar</TableHead>
                    <TableHead className="text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map(domain => {
                    const days = daysUntilExpiry(domain.expiryDate)
                    const isUrgent = days !== null && days <= 14
                    return (
                      <TableRow
                        key={domain.id}
                        className={`group ${isUrgent ? 'bg-destructive/5 hover:bg-destructive/10' : ''}`}
                      >
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              domain.status === 'active' ? 'bg-accent/10' : 'bg-muted'
                            }`}>
                              <Globe className={`h-4 w-4 ${domain.status === 'active' ? 'text-accent' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm font-mono leading-tight">{domain.name}</p>
                              <div className="sm:hidden">
                                <ExpiryIndicator expiryDate={domain.expiryDate} />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DomainStatusBadge status={domain.status} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <ExpiryIndicator expiryDate={domain.expiryDate} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground capitalize">{domain.registrar ?? '—'}</span>
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <Button variant="ghost" size="sm" asChild className="h-7 px-2.5 text-xs gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Link href={`/client/domains/${domain.id}`}>
                              <Settings className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Manage</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
