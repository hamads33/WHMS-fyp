'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  MoreHorizontal, Eye, Trash2, Loader2, RefreshCw, Plus,
  AlertCircle, Globe, ShieldCheck, Clock, XCircle, Search,
  TrendingUp, RefreshCcw,
} from 'lucide-react'

import {
  adminGetDomains, adminDeleteDomain, adminSyncDomain, getDomainStats,
  formatDate, daysUntilExpiry,
} from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'

/* ── status config ───────────────────────────────────────── */
const STATUS_CONFIG = {
  active:            { label: 'Active',           classes: 'bg-accent/10 text-accent border-accent/20' },
  expired:           { label: 'Expired',          classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  transfer_pending:  { label: 'Transfer Pending', classes: 'bg-muted text-foreground border-muted-foreground/20' },
  transfer_failed:   { label: 'Transfer Failed',  classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  grace:             { label: 'Grace Period',     classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  redemption:        { label: 'Redemption',       classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  pending_registration: { label: 'Pending', classes: 'bg-muted text-foreground border-muted-foreground/20' },
  cancelled:         { label: 'Cancelled',        classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  transferred_out:   { label: 'Transferred Out',  classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
}

function DomainStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-muted text-muted-foreground border-muted-foreground/20' }
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </Badge>
  )
}

function ExpiryChip({ expiryDate }) {
  const days = daysUntilExpiry(expiryDate)
  if (days === null) return <span className="text-muted-foreground text-sm">—</span>
  if (days < 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><XCircle className="h-3 w-3" />{Math.abs(days)}d ago</span>
  if (days <= 30) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Clock className="h-3 w-3" />{days}d left</span>
  return <span className="text-sm text-muted-foreground">{days}d</span>
}

/* ── stat card ──────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold mt-1 text-foreground">{value ?? 0}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2.5 rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── page ─────────────────────────────────────────────── */
export default function DomainsPage() {
  const [domains, setDomains]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [stats, setStats]             = useState(null)
  const [searchTerm, setSearchTerm]   = useState('')
  const [statusFilter, setStatusFilter]     = useState('all')
  const [registrarFilter, setRegistrarFilter] = useState('all')
  const [pageSize, setPageSize]       = useState(25)
  const [selectedDomains, setSelectedDomains] = useState(new Set())
  const [deleteConfirm, setDeleteConfirm]     = useState(null)
  const [syncingId, setSyncingId]     = useState(null)

  useEffect(() => { fetchDomains(); fetchStats() }, [statusFilter, registrarFilter])

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const res = await adminGetDomains({
        status: statusFilter === 'all' ? undefined : statusFilter,
        registrar: registrarFilter === 'all' ? undefined : registrarFilter,
        limit: 1000,
      })
      setDomains(Array.isArray(res?.data) ? res.data : [])
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }, [statusFilter, registrarFilter])

  const fetchStats = useCallback(async () => {
    try { const res = await getDomainStats(); setStats(res?.data ?? null) }
    catch {}
  }, [])

  const registrars = useMemo(() => Array.from(new Set(domains.map(d => d.registrar).filter(Boolean))).sort(), [domains])

  const filteredDomains = useMemo(() => domains.filter(d => {
    const q = searchTerm.toLowerCase()
    return (!q || d.name?.toLowerCase().includes(q) || d.ownerId?.toLowerCase().includes(q))
      && (statusFilter === 'all' || d.status === statusFilter)
      && (registrarFilter === 'all' || d.registrar === registrarFilter)
  }), [domains, searchTerm, statusFilter, registrarFilter])

  const paginatedDomains = useMemo(() => filteredDomains.slice(0, pageSize), [filteredDomains, pageSize])

  const handleSelectAll = () => selectedDomains.size === paginatedDomains.length
    ? setSelectedDomains(new Set())
    : setSelectedDomains(new Set(paginatedDomains.map(d => d.id)))

  const handleDelete = async () => {
    try { await adminDeleteDomain(deleteConfirm.id); setDomains(prev => prev.filter(d => d.id !== deleteConfirm.id)); setDeleteConfirm(null) }
    catch (err) { alert(getErrorMessage(err)) }
  }

  const handleSync = async (id) => {
    try { setSyncingId(id); await adminSyncDomain(id); await fetchDomains() }
    catch (err) { alert(getErrorMessage(err)) }
    finally { setSyncingId(null) }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Domains</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage registrations, DNS, and renewals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchDomains} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/domains/register">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Register Domain
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Domains"   value={stats.total}       icon={Globe}        sub="All registrations" />
          <StatCard label="Active"          value={stats.active}      icon={ShieldCheck}  sub="Healthy & renewing" />
          <StatCard label="Expiring Soon"   value={stats.expiringSoon} icon={Clock}       sub="Within 30 days" />
          <StatCard label="Expired"         value={stats.expired}     icon={XCircle}      sub="Need attention" />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────── */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-4 flex gap-3 items-start">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Failed to load domains</p>
              <p className="text-xs text-destructive/75 mt-0.5">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filters ─────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search domain or owner ID…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="grace">Grace Period</SelectItem>
                <SelectItem value="transfer_pending">Transfer Pending</SelectItem>
                <SelectItem value="pending_registration">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={registrarFilter} onValueChange={setRegistrarFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Registrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Registrars</SelectItem>
                {registrars.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={pageSize.toString()} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={n.toString()}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5">
          <div>
            <CardTitle className="text-sm font-semibold">
              {filteredDomains.length} domain{filteredDomains.length !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Showing {paginatedDomains.length} of {filteredDomains.length}
              {selectedDomains.size > 0 && ` · ${selectedDomains.size} selected`}
            </CardDescription>
          </div>
        </CardHeader>

        {loading ? (
          <CardContent className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </CardContent>
        ) : paginatedDomains.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No domains found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or register a new domain.</p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="w-10 pl-5">
                      <Checkbox
                        checked={paginatedDomains.length > 0 && selectedDomains.size === paginatedDomains.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="hidden md:table-cell">Owner</TableHead>
                    <TableHead>Registrar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Expires</TableHead>
                    <TableHead className="hidden sm:table-cell">Days Left</TableHead>
                    <TableHead className="w-10 pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDomains.map(domain => (
                    <TableRow key={domain.id} className="group">
                      <TableCell className="pl-5">
                        <Checkbox
                          checked={selectedDomains.has(domain.id)}
                          onCheckedChange={() => {
                            const s = new Set(selectedDomains)
                            s.has(domain.id) ? s.delete(domain.id) : s.add(domain.id)
                            setSelectedDomains(s)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm font-mono leading-tight">{domain.name}</p>
                            <p className="text-xs text-muted-foreground">{domain.id?.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground font-mono">{domain.ownerId?.slice(0, 12) ?? '—'}…</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal capitalize">
                          {domain.registrar ?? 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DomainStatusBadge status={domain.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(domain.expiryDate)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <ExpiryChip expiryDate={domain.expiryDate} />
                      </TableCell>
                      <TableCell className="pr-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/domains/${domain.id}`} className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSync(domain.id)}
                              disabled={syncingId === domain.id}
                              className="flex items-center gap-2"
                            >
                              <RefreshCcw className={`h-3.5 w-3.5 ${syncingId === domain.id ? 'animate-spin' : ''}`} />
                              {syncingId === domain.id ? 'Syncing…' : 'Sync with Registrar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive flex items-center gap-2"
                              onClick={() => setDeleteConfirm(domain)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredDomains.length > pageSize && (
              <div className="flex justify-center p-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setPageSize(p => p + 25)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Load more ({filteredDomains.length - pageSize} remaining)
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Delete Dialog ───────────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-mono font-semibold">{deleteConfirm?.name}</span>?
              This will set it to cancelled. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 focus:ring-destructive" onClick={handleDelete}>
              Delete Domain
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
