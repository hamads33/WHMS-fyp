'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Trash2, Copy, CheckCircle2, Loader2, RefreshCw,
  AlertCircle, Plus, Globe, Server, Shield, Clock,
  Calendar, DollarSign, Activity, Settings2, XCircle, Search,
  Building2, Lock, Info,
} from 'lucide-react'

import {
  adminGetDomainById, adminDeleteDomain, adminSyncDomain, adminOverrideDomain,
  getDnsRecords, addDnsRecord, deleteDnsRecord, getDomainLogs,
  formatDate, daysUntilExpiry,
} from '@/lib/api/domain'
import { getErrorMessage, apiFetch } from '@/lib/api/client'

/* ── status config ─────────────────────────────────────── */
const STATUS_CONFIG = {
  active:            { label: 'Active',           classes: 'bg-accent/10 text-accent border-accent/20' },
  expired:           { label: 'Expired',          classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  transfer_pending:  { label: 'Transfer Pending', classes: 'bg-muted text-foreground border-muted-foreground/20' },
  transfer_failed:   { label: 'Transfer Failed',  classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  grace:             { label: 'Grace Period',     classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  redemption:        { label: 'Redemption',       classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  pending_registration: { label: 'Pending', classes: 'bg-muted text-foreground border-muted-foreground/20' },
  cancelled:         { label: 'Cancelled',        classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
}

function DomainStatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-muted text-muted-foreground border-muted-foreground/20' }
  return (
    <Badge variant="outline" className={`font-medium ${size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs'} ${cfg.classes}`}>
      {cfg.label}
    </Badge>
  )
}

const DNS_TYPE_COLORS = {
  A: 'bg-muted text-muted-foreground',
  AAAA: 'bg-muted text-muted-foreground',
  CNAME: 'bg-muted text-muted-foreground',
  MX: 'bg-muted text-muted-foreground',
  TXT: 'bg-muted text-muted-foreground',
  NS: 'bg-muted text-muted-foreground',
  SRV: 'bg-muted text-muted-foreground',
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-all">{value ?? '—'}</span>
    </div>
  )
}

export default function DomainDetailPage() {
  const { id } = useParams()
  const router  = useRouter()

  const [domain,     setDomain]     = useState(null)
  const [dnsRecords, setDnsRecords] = useState([])
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [copied,     setCopied]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [syncing,    setSyncing]    = useState(false)

  const [newDns,     setNewDns]     = useState({ type: 'A', name: '', value: '', ttl: '3600' })
  const [addingDns,  setAddingDns]  = useState(false)
  const [dnsError,   setDnsError]   = useState(null)

  const [overrideData, setOverrideData] = useState({ status: '', expiryDate: '' })
  const [overriding,   setOverriding]   = useState(false)
  const [overrideMsg,  setOverrideMsg]  = useState(null)

  const [whois,        setWhois]        = useState(null)
  const [whoisLoading, setWhoisLoading] = useState(false)
  const [whoisError,   setWhoisError]   = useState(null)
  const [whoisDomain,  setWhoisDomain]  = useState('')

  useEffect(() => { if (id) fetchAll() }, [id])

  const fetchAll = async () => {
    try {
      setLoading(true); setError(null)
      const [dr, dns, lr] = await Promise.all([
        adminGetDomainById(id),
        getDnsRecords(id),
        getDomainLogs(id),
      ])
      const d = dr?.data ?? null
      setDomain(d)
      setDnsRecords(Array.isArray(dns?.data) ? dns.data : [])
      setLogs(Array.isArray(lr?.data) ? lr.data : [])
      if (d) setOverrideData({ status: d.status ?? '', expiryDate: d.expiryDate?.split('T')[0] ?? '' })
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  const handleCopy = (val, key) => { navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(null), 1500) }
  const handleDelete = async () => { try { await adminDeleteDomain(id); router.push('/admin/domains') } catch (err) { alert(getErrorMessage(err)) } }
  const handleSync = async () => { try { setSyncing(true); await adminSyncDomain(id); await fetchAll() } catch (err) { alert(getErrorMessage(err)) } finally { setSyncing(false) } }

  const handleAddDns = async () => {
    if (!newDns.name || !newDns.value) { setDnsError('Name and value are required'); return }
    try {
      setAddingDns(true); setDnsError(null)
      await addDnsRecord(id, { type: newDns.type, name: newDns.name, value: newDns.value, ttl: parseInt(newDns.ttl) || 3600 })
      setNewDns({ type: 'A', name: '', value: '', ttl: '3600' })
      await fetchAll()
    } catch (err) { setDnsError(getErrorMessage(err)) }
    finally { setAddingDns(false) }
  }

  const handleWhoisLookup = async (domainName) => {
    const target = domainName || whoisDomain || domain?.name
    if (!target) return
    try {
      setWhoisLoading(true); setWhoisError(null); setWhois(null)
      const res = await apiFetch(`/admin/domains/whois?domain=${encodeURIComponent(target)}`)
      setWhois(res?.data ?? null)
      setWhoisDomain(target)
    } catch (err) { setWhoisError(getErrorMessage(err)) }
    finally { setWhoisLoading(false) }
  }

  const handleOverride = async () => {
    try {
      setOverriding(true); setOverrideMsg(null)
      const payload = {}
      if (overrideData.status && overrideData.status !== domain.status) payload.status = overrideData.status
      if (overrideData.expiryDate) payload.expiryDate = new Date(overrideData.expiryDate).toISOString()
      if (!Object.keys(payload).length) { setOverrideMsg({ type: 'info', text: 'Nothing changed.' }); return }
      await adminOverrideDomain(id, payload)
      await fetchAll()
      setOverrideMsg({ type: 'success', text: 'Domain updated successfully.' })
    } catch (err) { setOverrideMsg({ type: 'error', text: getErrorMessage(err) }) }
    finally { setOverriding(false) }
  }

  /* ── loading / error ────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  if (error || !domain) return (
    <div className="space-y-6">
      <Link href="/admin/domains"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-4 flex gap-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-destructive">Error Loading Domain</p>
            <p className="text-xs text-destructive/75 mt-0.5">{error || 'Domain not found'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const expiryDays = daysUntilExpiry(domain.expiryDate)

  /* ── UI ─────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/domains">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All Domains
        </Button>
      </Link>

      {/* ── Domain Header card ─────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold font-mono">{domain.name}</h1>
                  <DomainStatusBadge status={domain.status} size="lg" />
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {domain.id}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary strip ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Server, label: 'Registrar', value: domain.registrar ?? 'N/A' },
          {
            icon: Calendar, label: 'Expires',
            value: <span className={expiryDays !== null && expiryDays <= 0 ? 'text-destructive' : expiryDays !== null && expiryDays <= 30 ? 'text-muted-foreground' : ''}>
              {formatDate(domain.expiryDate)}
            </span>
          },
          {
            icon: Clock, label: 'Days Left',
            value: expiryDays !== null
              ? <span className={expiryDays <= 0 ? 'font-bold text-destructive' : expiryDays <= 30 ? 'font-bold text-muted-foreground' : 'font-semibold text-accent'}>
                  {expiryDays <= 0 ? `${Math.abs(expiryDays)}d overdue` : `${expiryDays} days`}
                </span>
              : '—'
          },
          { icon: DollarSign, label: 'Currency', value: domain.currency ?? 'USD' },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-sm font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      <Tabs defaultValue="dns">
        <TabsList className="w-full grid grid-cols-5 h-10">
          <TabsTrigger value="dns" className="gap-1.5 text-xs"><Server className="h-3.5 w-3.5" /> DNS</TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5 text-xs"><Globe className="h-3.5 w-3.5" /> Details</TabsTrigger>
          <TabsTrigger value="whois" className="gap-1.5 text-xs" onClick={() => !whois && handleWhoisLookup(domain?.name)}><Search className="h-3.5 w-3.5" /> WHOIS</TabsTrigger>
          <TabsTrigger value="override" className="gap-1.5 text-xs"><Settings2 className="h-3.5 w-3.5" /> Override</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Logs</TabsTrigger>
        </TabsList>

        {/* ── DNS Tab ──────────────────────────────────── */}
        <TabsContent value="dns" className="space-y-4 mt-4">
          {/* Nameservers */}
          {domain.nameservers?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" /> Nameservers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {domain.nameservers.map((ns, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/50 px-4 py-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium w-8">NS{i + 1}</span>
                      <code className="text-sm">{ns}</code>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(ns, `ns-${i}`)}>
                      {copied === `ns-${i}` ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add DNS Record */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Add DNS Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <Label className="text-xs mb-1.5 block">Type</Label>
                  <select
                    value={newDns.type}
                    onChange={e => setNewDns({ ...newDns, type: e.target.value })}
                    className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
                  >
                    {['A','AAAA','CNAME','MX','TXT','NS','SRV'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Name</Label>
                  <Input placeholder="@" value={newDns.name} onChange={e => setNewDns({ ...newDns, name: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Value</Label>
                  <Input placeholder="1.1.1.1" value={newDns.value} onChange={e => setNewDns({ ...newDns, value: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">TTL</Label>
                  <Input type="number" value={newDns.ttl} onChange={e => setNewDns({ ...newDns, ttl: e.target.value })} className="h-9 text-sm" />
                </div>
              </div>
              {dnsError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{dnsError}</p>}
              <Button onClick={handleAddDns} disabled={addingDns} size="sm">
                {addingDns ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-2" />}
                Add Record
              </Button>
            </CardContent>
          </Card>

          {/* DNS Records table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">DNS Records ({dnsRecords.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dnsRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Server className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No DNS records yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-5">Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="hidden sm:table-cell">TTL</TableHead>
                        <TableHead className="w-10 pr-5" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dnsRecords.map(r => (
                        <TableRow key={r.id} className="group">
                          <TableCell className="pl-5">
                            <span className={`inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded ${DNS_TYPE_COLORS[r.type] ?? 'bg-muted text-muted-foreground'}`}>
                              {r.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{r.name}</TableCell>
                          <TableCell className="font-mono text-sm max-w-xs truncate text-muted-foreground">{r.value}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{r.ttl}s</TableCell>
                          <TableCell className="pr-5">
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={async () => { await deleteDnsRecord(id, r.id); await fetchAll() }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Details Tab ──────────────────────────────── */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Domain Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <InfoRow label="Domain Name" value={<span className="font-mono">{domain.name}</span>} />
                  <InfoRow label="Owner ID" value={<span className="font-mono text-xs">{domain.ownerId}</span>} />
                  <InfoRow label="Registrar" value={domain.registrar} />
                  <InfoRow label="Status" value={<DomainStatusBadge status={domain.status} />} />
                </div>
                <div>
                  <InfoRow label="Registered" value={formatDate(domain.createdAt)} />
                  <InfoRow label="Expires" value={formatDate(domain.expiryDate)} />
                  <InfoRow label="Reg. Price" value={domain.registrationPrice ? `${domain.registrationPrice} ${domain.currency ?? 'USD'}` : '—'} />
                  <InfoRow label="Auto-Renew" value={
                    <Badge variant={domain.autoRenew ? 'default' : 'outline'} className="text-xs">
                      {domain.autoRenew ? 'Enabled' : 'Disabled'}
                    </Badge>
                  } />
                </div>
              </div>

              {domain.contacts?.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">WHOIS Contacts</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {domain.contacts.map((c, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                        <Badge variant="outline" className="capitalize text-xs mb-2">{c.type}</Badge>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                        <p className="text-xs text-muted-foreground">{c.country}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WHOIS Tab ────────────────────────────────── */}
        <TabsContent value="whois" className="mt-4 space-y-4">
          {/* Search bar */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="example.com"
                    value={whoisDomain}
                    onChange={e => setWhoisDomain(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleWhoisLookup()}
                    className="pl-9 h-9 text-sm font-mono"
                  />
                </div>
                <Button size="sm" onClick={() => handleWhoisLookup()} disabled={whoisLoading} className="h-9 px-4">
                  {whoisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {whoisError && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/50 text-destructive rounded-lg p-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{whoisError}</span>
            </div>
          )}

          {whoisLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {whois && !whoisLoading && (
            <>
              {!whois.found ? (
                <Card>
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{whois.message || 'No WHOIS data found for this domain.'}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Registration Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" /> Registration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InfoRow label="Domain" value={<span className="font-mono">{whois.domain}</span>} />
                      <InfoRow label="Registered" value={whois.registeredOn ? formatDate(whois.registeredOn) : '—'} />
                      <InfoRow label="Updated" value={whois.updatedOn ? formatDate(whois.updatedOn) : '—'} />
                      <InfoRow label="Expires" value={whois.expiresOn ? formatDate(whois.expiresOn) : '—'} />
                      <InfoRow label="DNSSEC" value={
                        <Badge variant="outline" className={`text-xs ${whois.secureDns ? 'text-accent border-accent/30' : 'text-muted-foreground'}`}>
                          {whois.secureDns ? 'Signed' : 'Unsigned'}
                        </Badge>
                      } />
                    </CardContent>
                  </Card>

                  {/* Registrar Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" /> Registrar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InfoRow label="Name" value={whois.registrar || '—'} />
                      <InfoRow label="IANA ID" value={whois.registrarIanaId || '—'} />
                      <InfoRow label="URL" value={whois.registrarUrl
                        ? <a href={whois.registrarUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate max-w-[180px] inline-block">{whois.registrarUrl}</a>
                        : '—'
                      } />
                      {whois.status?.length > 0 && (
                        <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
                          <span className="text-sm text-muted-foreground shrink-0">Status</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {whois.status.slice(0, 3).map(s => (
                              <Badge key={s} variant="outline" className="text-xs capitalize">
                                {s.replace(/([A-Z])/g, ' $1').trim()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Nameservers */}
                  {whois.nameservers?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" /> Nameservers
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5">
                        {whois.nameservers.map((ns, i) => (
                          <div key={i} className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                            <span className="text-xs text-muted-foreground w-7">NS{i+1}</span>
                            <code className="text-sm">{ns}</code>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Registrant Contact */}
                  {whois.registrant && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" /> Registrant
                          {whois.registrant.redacted && (
                            <Badge variant="outline" className="text-xs ml-auto text-muted-foreground border-muted-foreground/30">GDPR Redacted</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {whois.registrant.redacted ? (
                          <p className="text-sm text-muted-foreground">Contact details are redacted per GDPR/privacy policy.</p>
                        ) : (
                          <>
                            {whois.registrant.name && <InfoRow label="Name" value={whois.registrant.name} />}
                            {whois.registrant.organization && <InfoRow label="Org" value={whois.registrant.organization} />}
                            {whois.registrant.email && <InfoRow label="Email" value={whois.registrant.email} />}
                            {whois.registrant.country && <InfoRow label="Country" value={whois.registrant.country} />}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Override Tab ─────────────────────────────── */}
        <TabsContent value="override" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" /> Admin Override
              </CardTitle>
              <CardDescription className="text-xs">
                Force-update domain fields. These changes are logged in the audit trail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overrideMsg && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                  overrideMsg.type === 'success' ? 'bg-accent/10 text-accent'
                  : overrideMsg.type === 'error' ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-foreground'
                }`}>
                  {overrideMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {overrideMsg.text}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Force Status</Label>
                  <select
                    value={overrideData.status}
                    onChange={e => setOverrideData({ ...overrideData, status: e.target.value })}
                    className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
                  >
                    {['active','expired','grace','redemption','transfer_pending','transfer_failed','cancelled','pending_registration'].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Force Expiry Date</Label>
                  <Input
                    type="date"
                    value={overrideData.expiryDate}
                    onChange={e => setOverrideData({ ...overrideData, expiryDate: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <Button onClick={handleOverride} disabled={overriding} size="sm" variant="secondary">
                {overriding ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Settings2 className="h-3.5 w-3.5 mr-2" />}
                Apply Override
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Logs Tab ─────────────────────────────────── */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Activity Log</CardTitle>
              <CardDescription className="text-xs">{logs.length} event{logs.length !== 1 ? 's' : ''} recorded</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {logs.map((log, i) => (
                    <div key={log.id} className="flex gap-4 pb-4">
                      <div className="flex flex-col items-center">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Activity className="h-3.5 w-3.5 text-primary" />
                        </div>
                        {i < logs.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold capitalize">{log.action?.replace(/_/g, ' ')}</p>
                          <span className="text-xs text-muted-foreground shrink-0">{formatDate(log.createdAt)}</span>
                        </div>
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <pre className="text-xs bg-muted/50 p-2 rounded mt-1.5 overflow-auto max-h-28 text-muted-foreground">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Delete Dialog ────────────────────────────── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> Delete Domain
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel{' '}
              <span className="font-mono font-semibold">{domain.name}</span>.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <AlertDialogCancel>Keep Domain</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 focus:ring-destructive" onClick={handleDelete}>
              Delete Domain
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
