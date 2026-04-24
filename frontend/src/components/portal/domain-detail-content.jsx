'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, Globe, Server, Plus, Trash2, Loader2, AlertCircle,
  CheckCircle2, Clock, Calendar, RefreshCw, Copy, Shield,
  AlertTriangle, XCircle, Search, Building2, Lock, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  getDomainById, getDnsRecords, addDnsRecord, deleteDnsRecord,
  updateNameservers, renewDomain, formatDate, daysUntilExpiry,
} from '@/lib/api/domain'
import { getErrorMessage, apiFetch } from '@/lib/api/client'

/* ── helpers ────────────────────────────────────────────── */
const STATUS_CONFIG = {
  active:               { label: 'Active',           classes: 'bg-accent/10 text-foreground border-accent/20' },
  expired:              { label: 'Expired',          classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  grace:                { label: 'Grace Period',     classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  transfer_pending:     { label: 'Transfer Pending', classes: 'bg-muted text-foreground border-border' },
  pending_registration: { label: 'Pending',          classes: 'bg-muted text-foreground border-border' },
  cancelled:            { label: 'Cancelled',        classes: 'bg-muted text-muted-foreground border-border' },
}

const DNS_TYPE_COLORS = {
  A:     'bg-muted text-foreground',
  AAAA:  'bg-muted text-foreground',
  CNAME: 'bg-muted text-foreground',
  MX:    'bg-muted text-foreground',
  TXT:   'bg-muted text-foreground',
  NS:    'bg-muted text-foreground',
  SRV:   'bg-muted text-foreground',
}

function DomainStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-500/10 text-gray-600 border-gray-500/20' }
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </Badge>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}

/* ── component ──────────────────────────────────────────── */
export function DomainDetailContent({ domainId }) {
  const [domain,     setDomain]     = useState(null)
  const [dnsRecords, setDnsRecords] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [copied,     setCopied]     = useState(null)

  // Nameserver edit
  const [editingNs, setEditingNs] = useState(false)
  const [ns1,       setNs1]       = useState('')
  const [ns2,       setNs2]       = useState('')
  const [savingNs,  setSavingNs]  = useState(false)

  // DNS add
  const [newRecord, setNewRecord] = useState({ type: 'A', name: '', value: '', ttl: '3600' })
  const [addingDns, setAddingDns] = useState(false)
  const [dnsError,  setDnsError]  = useState(null)

  // Renew
  const [renewing, setRenewing] = useState(false)

  // WHOIS
  const [whois,        setWhois]        = useState(null)
  const [whoisLoading, setWhoisLoading] = useState(false)
  const [whoisError,   setWhoisError]   = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true); setError(null)
      const [dr, dnsRes] = await Promise.all([
        getDomainById(domainId),
        getDnsRecords(domainId),
      ])
      const d = dr?.data ?? null
      setDomain(d)
      setDnsRecords(Array.isArray(dnsRes?.data) ? dnsRes.data : [])
      if (d?.nameservers) { setNs1(d.nameservers[0] ?? ''); setNs2(d.nameservers[1] ?? '') }
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (domainId) fetchData() }, [domainId])

  const handleCopy = (val, key) => { navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(null), 1500) }

  const handleSaveNs = async () => {
    try { setSavingNs(true); await updateNameservers(domainId, [ns1, ns2].filter(Boolean)); setEditingNs(false); await fetchData() }
    catch (err) { alert(getErrorMessage(err)) }
    finally { setSavingNs(false) }
  }

  const handleAddDns = async () => {
    if (!newRecord.name || !newRecord.value) { setDnsError('Name and value are required'); return }
    try {
      setAddingDns(true); setDnsError(null)
      await addDnsRecord(domainId, { type: newRecord.type, name: newRecord.name, value: newRecord.value, ttl: parseInt(newRecord.ttl) || 3600 })
      setNewRecord({ type: 'A', name: '', value: '', ttl: '3600' })
      await fetchData()
    } catch (err) { setDnsError(getErrorMessage(err)) }
    finally { setAddingDns(false) }
  }

  const handleDeleteDns = async (recordId) => {
    try { await deleteDnsRecord(domainId, recordId); await fetchData() }
    catch (err) { alert(getErrorMessage(err)) }
  }

  const handleRenew = async () => {
    try {
      setRenewing(true)
      await renewDomain(domainId, 1)
      await fetchData()
    } catch (err) { alert(getErrorMessage(err)) }
    finally { setRenewing(false) }
  }

  const handleWhoisLookup = async () => {
    if (!domain?.name) return
    try {
      setWhoisLoading(true); setWhoisError(null); setWhois(null)
      const res = await apiFetch(`/domains/whois?domain=${encodeURIComponent(domain.name)}`)
      setWhois(res?.data ?? null)
    } catch (err) { setWhoisError(getErrorMessage(err)) }
    finally { setWhoisLoading(false) }
  }

  /* ── loading / error ────────────────────────────────── */
  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (error || !domain) return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/client/domains"><ArrowLeft className="h-4 w-4 mr-2" />Back to Domains</Link>
      </Button>
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="py-4 px-4 flex gap-3 items-start">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error ?? `Domain not found.`}</p>
        </CardContent>
      </Card>
    </div>
  )

  const expiryDays = daysUntilExpiry(domain.expiryDate)
  const isExpiringSoon = expiryDays !== null && expiryDays >= 0 && expiryDays <= 30

  /* ── UI ─────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
        <Link href="/client/domains"><ArrowLeft className="h-4 w-4" />Domains</Link>
      </Button>

      {/* ── Header card ─────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className={`h-1.5 w-full ${
          domain.status === 'active' && !isExpiringSoon ? 'bg-gradient-to-r from-accent/40 via-accent to-accent/40'
          : isExpiringSoon ? 'bg-gradient-to-r from-destructive/40 via-destructive to-destructive/40'
          : 'bg-gradient-to-r from-border via-muted-foreground/30 to-border'
        }`} />
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                domain.status === 'active' ? 'bg-accent/10' : 'bg-muted'
              }`}>
                <Globe className={`h-5 w-5 ${domain.status === 'active' ? 'text-accent' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold font-mono">{domain.name}</h1>
                  <DomainStatusBadge status={domain.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {domain.registrar} &mdash; Expires {formatDate(domain.expiryDate)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 h-8 text-xs shrink-0">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expiry warning */}
      {isExpiringSoon && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="py-3 px-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Domain expiring soon</p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  {expiryDays <= 0
                    ? `This domain expired ${Math.abs(expiryDays)} day${expiryDays !== -1 ? 's' : ''} ago.`
                    : `This domain expires in ${expiryDays} day${expiryDays !== 1 ? 's' : ''}.`}
                </p>
              </div>
            </div>
            <Button
              size="sm" variant="destructive"
              onClick={handleRenew} disabled={renewing}
              className="shrink-0 h-8 text-xs gap-1.5"
            >
              {renewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Renew Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Quick stats strip ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Globe,    label: 'Registrar', value: domain.registrar ?? 'N/A' },
          {
            icon: Calendar, label: 'Expires',
            value: <span className={expiryDays !== null && expiryDays <= 0 ? 'text-destructive' : expiryDays !== null && expiryDays <= 30 ? 'text-destructive' : ''}>
              {formatDate(domain.expiryDate)}
            </span>
          },
          {
            icon: Clock, label: 'Days Left',
            value: expiryDays !== null
              ? <span className={expiryDays <= 0 ? 'text-destructive font-bold' : expiryDays <= 30 ? 'text-destructive font-bold' : 'text-accent font-semibold'}>
                  {expiryDays <= 0 ? `Expired` : `${expiryDays}d`}
                </span>
              : '—'
          },
          {
            icon: Shield, label: 'Auto-Renew',
            value: <Badge variant={domain.autoRenew ? 'default' : 'outline'} className="text-xs">
              {domain.autoRenew ? 'On' : 'Off'}
            </Badge>
          },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide font-medium">{label}</span>
              </div>
              <p className="text-sm font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="dns" className="text-xs gap-1.5">
            <Server className="h-3.5 w-3.5" /> DNS {dnsRecords.length > 0 && `(${dnsRecords.length})`}
          </TabsTrigger>
          <TabsTrigger value="whois" className="text-xs gap-1.5" onClick={() => !whois && handleWhoisLookup()}>
            <Search className="h-3.5 w-3.5" /> WHOIS
          </TabsTrigger>
        </TabsList>

        {/* ── Overview tab ─────────────────────────── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Domain info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" /> Domain Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Domain Name" value={<span className="font-mono">{domain.name}</span>} />
                <InfoRow label="Status" value={<DomainStatusBadge status={domain.status} />} />
                <InfoRow label="Registrar" value={domain.registrar} />
                <InfoRow label="Expiry Date" value={formatDate(domain.expiryDate)} />
                <InfoRow label="Auto-Renew" value={
                  <Badge variant={domain.autoRenew ? 'default' : 'outline'} className="text-xs">
                    {domain.autoRenew ? 'Enabled' : 'Disabled'}
                  </Badge>
                } />
                <InfoRow label="Currency" value={domain.currency ?? 'USD'} />
              </CardContent>
            </Card>

            {/* Nameservers */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" /> Nameservers
                </CardTitle>
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => setEditingNs(!editingNs)}
                >
                  {editingNs ? 'Cancel' : 'Edit'}
                </Button>
              </CardHeader>
              <CardContent>
                {editingNs ? (
                  <div className="space-y-3">
                    {[
                      { label: 'Nameserver 1', val: ns1, set: setNs1, ph: 'ns1.example.com' },
                      { label: 'Nameserver 2', val: ns2, set: setNs2, ph: 'ns2.example.com' },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label}>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
                        <Input value={val} onChange={e => set(e.target.value)} className="h-8 text-sm font-mono" placeholder={ph} />
                      </div>
                    ))}
                    <Button size="sm" onClick={handleSaveNs} disabled={savingNs} className="w-full h-8 text-xs mt-1">
                      {savingNs ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                      Save Nameservers
                    </Button>
                  </div>
                ) : (domain.nameservers?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    {domain.nameservers.map((ns, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground font-medium w-7">NS{i + 1}</span>
                          <span className="text-sm font-mono">{ns}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy(ns, `ns-${i}`)}>
                          {copied === `ns-${i}`
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                            : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Server className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No nameservers configured</p>
                    <Button variant="link" size="sm" className="text-xs mt-1 h-auto p-0" onClick={() => setEditingNs(true)}>
                      Add nameservers
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── DNS tab ──────────────────────────────── */}
        <TabsContent value="dns" className="mt-4 space-y-4">
          {/* Add record form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Add DNS Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <Label className="text-xs mb-1.5 block">Type</Label>
                  <select
                    value={newRecord.type}
                    onChange={e => setNewRecord({ ...newRecord, type: e.target.value })}
                    className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
                  >
                    {['A','AAAA','CNAME','MX','TXT','NS','SRV'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Name</Label>
                  <Input placeholder="@" value={newRecord.name} onChange={e => setNewRecord({ ...newRecord, name: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Value</Label>
                  <Input placeholder="1.1.1.1" value={newRecord.value} onChange={e => setNewRecord({ ...newRecord, value: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">TTL</Label>
                  <Input type="number" value={newRecord.ttl} onChange={e => setNewRecord({ ...newRecord, ttl: e.target.value })} className="h-9 text-sm" />
                </div>
              </div>
              {dnsError && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />{dnsError}
                </p>
              )}
              <Button size="sm" onClick={handleAddDns} disabled={addingDns} className="gap-1.5">
                {addingDns ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Record
              </Button>
            </CardContent>
          </Card>

          {/* Records table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">DNS Records</CardTitle>
              <CardDescription className="text-xs">{dnsRecords.length} record{dnsRecords.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {dnsRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Server className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No DNS records yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add a record above to get started</p>
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
                      {dnsRecords.map(record => (
                        <TableRow key={record.id} className="group">
                          <TableCell className="pl-5">
                            <span className={`inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${DNS_TYPE_COLORS[record.type] ?? 'bg-muted text-muted-foreground'}`}>
                              {record.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{record.name}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground max-w-48 truncate">{record.value}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{record.ttl}s</TableCell>
                          <TableCell className="pr-5">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteDns(record.id)}
                              aria-label="Delete record"
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
        {/* ── WHOIS tab ────────────────────────────── */}
        <TabsContent value="whois" className="mt-4 space-y-4">
          {whoisError && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{whoisError}</span>
            </div>
          )}

          {whoisLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!whois && !whoisLoading && !whoisError && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Looking up WHOIS data…</p>
              </CardContent>
            </Card>
          )}

          {whois && !whoisLoading && (
            !whois.found ? (
              <Card>
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">{whois.message || 'No WHOIS data available for this domain.'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {/* Registration + Registrar */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" /> Registration Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InfoRow label="Registered" value={whois.registeredOn ? formatDate(whois.registeredOn) : '—'} />
                      <InfoRow label="Updated" value={whois.updatedOn ? formatDate(whois.updatedOn) : '—'} />
                      <InfoRow label="Expires" value={whois.expiresOn ? formatDate(whois.expiresOn) : '—'} />
                      <InfoRow label="DNSSEC" value={
                        <Badge variant="outline" className={`text-xs ${whois.secureDns ? 'text-accent border-accent/30' : ''}`}>
                          {whois.secureDns ? 'Signed' : 'Unsigned'}
                        </Badge>
                      } />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" /> Registrar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InfoRow label="Name" value={whois.registrar || '—'} />
                      <InfoRow label="IANA ID" value={whois.registrarIanaId || '—'} />
                      {whois.status?.length > 0 && (
                        <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
                          <span className="text-sm text-muted-foreground shrink-0">Status</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {whois.status.slice(0, 3).map(s => (
                              <Badge key={s} variant="outline" className="text-xs">
                                {s.replace(/([A-Z])/g, ' $1').trim()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Nameservers */}
                {whois.nameservers?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" /> Nameservers (from WHOIS)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {whois.nameservers.map((ns, i) => (
                        <div key={i} className="flex items-center gap-2.5 bg-muted/50 px-3 py-2 rounded-md">
                          <span className="text-xs text-muted-foreground w-7">NS{i+1}</span>
                          <code className="text-sm">{ns}</code>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Registrant */}
                {whois.registrant && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" /> Registrant Contact
                        {whois.registrant.redacted && (
                          <Badge variant="outline" className="text-xs ml-auto text-muted-foreground">GDPR Redacted</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {whois.registrant.redacted
                        ? <p className="text-sm text-muted-foreground">Registrant details are redacted for privacy (GDPR).</p>
                        : <>
                            {whois.registrant.name && <InfoRow label="Name" value={whois.registrant.name} />}
                            {whois.registrant.organization && <InfoRow label="Org" value={whois.registrant.organization} />}
                            {whois.registrant.email && <InfoRow label="Email" value={whois.registrant.email} />}
                            {whois.registrant.country && <InfoRow label="Country" value={whois.registrant.country} />}
                          </>
                      }
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
