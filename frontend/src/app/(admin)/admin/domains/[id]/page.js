'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Activity, AlertCircle, ArrowLeft, Building2, Calendar, DollarSign, Globe,
  Info, Loader2, Lock, RefreshCw, Search, Server, Settings2, Trash2,
  Waypoints, Route, Shield,
} from 'lucide-react'

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PorkbunDNS from '@/components/admin/domains/PorkbunDNS'
import PorkbunForwarding from '@/components/admin/domains/PorkbunForwarding'
import PorkbunGlue from '@/components/admin/domains/PorkbunGlue'
import PorkbunSSL from '@/components/admin/domains/PorkbunSSL'
import { useToast } from '@/hooks/use-toast'
import {
  adminCheckRenewalPrice,
  adminDeleteDomain,
  adminGetDomainById,
  adminRenewDomain,
  adminSyncDomain,
  formatDate,
  formatMoneyFromCents,
  getDomainLogs,
  daysUntilExpiry,
} from '@/lib/api/domain'
import { apiFetch, getErrorMessage } from '@/lib/api/client'
import { toastDomainError } from '@/lib/domain-error-toast'

const STATUS_CONFIG = {
  active: { label: 'Active', classes: 'bg-accent/10 text-accent border-accent/20' },
  expired: { label: 'Expired', classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  transfer_pending: { label: 'Transfer Pending', classes: 'bg-muted text-foreground border-muted-foreground/20' },
  transfer_failed: { label: 'Transfer Failed', classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  grace: { label: 'Grace Period', classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  redemption: { label: 'Redemption', classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  pending_registration: { label: 'Pending', classes: 'bg-muted text-foreground border-muted-foreground/20' },
  cancelled: { label: 'Cancelled', classes: 'bg-muted text-muted-foreground border-muted-foreground/20' },
}

function DomainStatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    classes: 'bg-muted text-muted-foreground border-muted-foreground/20',
  }

  return (
    <Badge variant="outline" className={`${size === 'lg' ? 'px-3 py-1 text-sm' : 'text-xs'} font-medium ${cfg.classes}`}>
      {cfg.label}
    </Badge>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="break-all text-right text-sm font-medium">{value ?? '—'}</span>
    </div>
  )
}

function LogList({ logs }) {
  if (!logs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Activity className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No domain activity has been logged yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{log.action}</p>
            <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
          </div>
          <pre className="mt-2 overflow-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(log.meta || {}, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}

export default function DomainDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const [domain, setDomain] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [renewPrice, setRenewPrice] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [renewForm, setRenewForm] = useState({ years: '1', currency: 'USD' })
  const [overrideData, setOverrideData] = useState({ status: '', expiryDate: '' })
  const [overriding, setOverriding] = useState(false)
  const [overrideMsg, setOverrideMsg] = useState(null)
  const [whois, setWhois] = useState(null)
  const [whoisLoading, setWhoisLoading] = useState(false)
  const [whoisError, setWhoisError] = useState(null)
  const [whoisDomain, setWhoisDomain] = useState('')
  const [activeTab, setActiveTab] = useState('details')

  const fetchDomain = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [domainRes, logsRes] = await Promise.all([
        adminGetDomainById(id),
        getDomainLogs(id),
      ])
      const currentDomain = domainRes?.data ?? null
      setDomain(currentDomain)
      setLogs(Array.isArray(logsRes?.data) ? logsRes.data : [])
      setOverrideData({
        status: currentDomain?.status ?? '',
        expiryDate: currentDomain?.expiryDate?.split('T')[0] ?? '',
      })
      if (currentDomain?.currency) {
        setRenewForm((prev) => ({ ...prev, currency: currentDomain.currency }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchDomain()
  }, [id, fetchDomain])

  const loadWhois = useCallback(async (domainName) => {
    const target = domainName || whoisDomain || domain?.name
    if (!target) return

    try {
      setWhoisLoading(true)
      setWhoisError(null)
      const res = await apiFetch(`/admin/domains/whois?domain=${encodeURIComponent(target)}`)
      setWhois(res?.data ?? null)
      setWhoisDomain(target)
    } catch (err) {
      setWhoisError(getErrorMessage(err))
    } finally {
      setWhoisLoading(false)
    }
  }, [domain?.name, whoisDomain])

  const handleOverride = useCallback(async () => {
    try {
      setOverriding(true)
      setOverrideMsg(null)
      const payload = {}
      if (overrideData.status && overrideData.status !== domain.status) payload.status = overrideData.status
      if (overrideData.expiryDate) payload.expiryDate = new Date(overrideData.expiryDate).toISOString()
      if (!Object.keys(payload).length) {
        setOverrideMsg({ type: 'info', text: 'Nothing changed.' })
        return
      }
      await apiFetch(`/admin/domains/${id}/override`, {
        method: 'PATCH',
        body: JSON.stringify({ changes: payload }),
      })
      setOverrideMsg({ type: 'success', text: 'Domain override saved.' })
      await fetchDomain()
    } catch (err) {
      setOverrideMsg({ type: 'error', text: getErrorMessage(err) })
      toastDomainError(toast, err, 'Override failed')
    } finally {
      setOverriding(false)
    }
  }, [domain, fetchDomain, id, overrideData, toast])

  const openRenewDialog = async () => {
    setRenewOpen(true)
    try {
      setPriceLoading(true)
      const res = await adminCheckRenewalPrice(id)
      setRenewPrice(res?.data ?? null)
    } catch (err) {
      toastDomainError(toast, err, 'Price check failed')
    } finally {
      setPriceLoading(false)
    }
  }

  const handleRenew = async () => {
    try {
      setRenewing(true)
      await adminRenewDomain(id, {
        years: Number(renewForm.years || 1),
        currency: renewForm.currency || 'USD',
      })
      toast({
        title: 'Domain renewed',
        description: `${domain.name} was extended after the live price check.`,
      })
      setRenewOpen(false)
      await fetchDomain()
    } catch (err) {
      toastDomainError(toast, err, 'Renewal failed')
    } finally {
      setRenewing(false)
    }
  }

  const handleDelete = async () => {
    try {
      await adminDeleteDomain(id)
      toast({ title: 'Domain cancelled', description: `${domain.name} was marked as cancelled.` })
      router.push('/admin/domains')
    } catch (err) {
      toastDomainError(toast, err, 'Delete failed')
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      await adminSyncDomain(id)
      toast({ title: 'Domain synced', description: 'Registrar data was refreshed successfully.' })
      await fetchDomain()
    } catch (err) {
      toastDomainError(toast, err, 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const tabs = useMemo(() => {
    if (!domain) return []

    const capabilities = domain.registrarCapabilities || {}
    const builtTabs = [
      {
        value: 'details',
        label: 'Details',
        icon: Globe,
        content: (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Domain Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <InfoRow label="Domain Name" value={<span className="font-mono">{domain.name}</span>} />
                  <InfoRow label="Owner ID" value={<span className="font-mono text-xs">{domain.ownerId}</span>} />
                  <InfoRow label="Registrar" value={domain.registrar || '—'} />
                  <InfoRow label="Status" value={<DomainStatusBadge status={domain.status} />} />
                </div>
                <div>
                  <InfoRow label="Registered" value={formatDate(domain.createdAt)} />
                  <InfoRow label="Expires" value={formatDate(domain.expiryDate)} />
                  <InfoRow label="Reg. Price" value={formatMoneyFromCents(domain.registrationPrice, domain.currency || 'USD')} />
                  <InfoRow label="Renewal Price" value={formatMoneyFromCents(domain.renewalPrice, domain.currency || 'USD')} />
                </div>
              </div>
            </CardContent>
          </Card>
        ),
      },
      ...(domain.registrar === 'porkbun' && capabilities.canManageDNS ? [{
        value: 'dns',
        label: 'DNS',
        icon: Server,
        content: <PorkbunDNS domainId={id} />,
      }] : []),
      ...(domain.registrar === 'porkbun' && capabilities.canManageGlue ? [{
        value: 'glue',
        label: 'Glue',
        icon: Waypoints,
        content: <PorkbunGlue domainId={id} />,
      }] : []),
      ...(domain.registrar === 'porkbun' && capabilities.canForwardURL ? [{
        value: 'forwarding',
        label: 'Forwarding',
        icon: Route,
        content: <PorkbunForwarding domainId={id} />,
      }] : []),
      ...(domain.registrar === 'porkbun' && capabilities.canManageSSL ? [{
        value: 'ssl',
        label: 'SSL',
        icon: Lock,
        content: <PorkbunSSL domainId={id} />,
      }] : []),
      {
        value: 'whois',
        label: 'WHOIS',
        icon: Search,
        content: (
          <div className="space-y-4">
            <Card>
              <CardContent className="flex gap-2 pt-4">
                <Input
                  value={whoisDomain}
                  onChange={(e) => setWhoisDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadWhois()}
                  placeholder="example.com"
                  className="h-9 text-sm font-mono"
                />
                <Button size="sm" onClick={() => loadWhois()} disabled={whoisLoading}>
                  {whoisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
                </Button>
              </CardContent>
            </Card>
            {whoisError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{whoisError}
              </div>
            )}
            {whois && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Globe className="h-4 w-4 text-muted-foreground" /> Registration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InfoRow label="Domain" value={<span className="font-mono">{whois.domain}</span>} />
                    <InfoRow label="Registered" value={whois.registeredOn ? formatDate(whois.registeredOn) : '—'} />
                    <InfoRow label="Updated" value={whois.updatedOn ? formatDate(whois.updatedOn) : '—'} />
                    <InfoRow label="Expires" value={whois.expiresOn ? formatDate(whois.expiresOn) : '—'} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="h-4 w-4 text-muted-foreground" /> Registrar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InfoRow label="Name" value={whois.registrar || '—'} />
                    <InfoRow label="IANA ID" value={whois.registrarIanaId || '—'} />
                    <InfoRow label="URL" value={whois.registrarUrl || '—'} />
                  </CardContent>
                </Card>
              </div>
            )}
            {!whois && !whoisLoading && (
              <Card>
                <CardContent className="flex items-center gap-3 pt-4">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Run a WHOIS lookup when you need current public registry data.</p>
                </CardContent>
              </Card>
            )}
          </div>
        ),
      },
      {
        value: 'override',
        label: 'Override',
        icon: Settings2,
        content: (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Admin Override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs">Status</Label>
                  <select
                    value={overrideData.status}
                    onChange={(e) => setOverrideData((prev) => ({ ...prev, status: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {Object.keys(STATUS_CONFIG).map((status) => (
                      <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Expiry Date</Label>
                  <Input
                    type="date"
                    value={overrideData.expiryDate}
                    onChange={(e) => setOverrideData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              {overrideMsg && (
                <div className={`rounded-md px-3 py-2 text-sm ${
                  overrideMsg.type === 'success'
                    ? 'bg-accent/10 text-accent'
                    : overrideMsg.type === 'error'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {overrideMsg.text}
                </div>
              )}
              <Button onClick={handleOverride} disabled={overriding}>
                {overriding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Save Override
              </Button>
            </CardContent>
          </Card>
        ),
      },
      {
        value: 'logs',
        label: 'Logs',
        icon: Activity,
        content: (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Domain Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <LogList logs={logs} />
            </CardContent>
          </Card>
        ),
      },
    ]

    return builtTabs
  }, [domain, handleOverride, id, loadWhois, logs, overrideData, overrideMsg, overriding, whois, whoisDomain, whoisError, whoisLoading])

  useEffect(() => {
    if (tabs.length && !tabs.find((tab) => tab.value === activeTab)) {
      setActiveTab(tabs[0].value)
    }
  }, [tabs, activeTab])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !domain) {
    return (
      <div className="space-y-6">
        <Link href="/admin/domains">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex gap-3 pt-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Error Loading Domain</p>
              <p className="mt-0.5 text-xs text-destructive/75">{error || 'Domain not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const expiryDays = daysUntilExpiry(domain.expiryDate)

  return (
    <div className="space-y-6">
      <Link href="/admin/domains">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All Domains
        </Button>
      </Link>

      <Card className="overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardContent className="pb-5 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-mono text-xl font-bold">{domain.name}</h1>
                  <DomainStatusBadge status={domain.status} size="lg" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Registrar: {domain.registrar || '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openRenewDialog}>
                <DollarSign className="mr-2 h-4 w-4" /> Renew
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Server, label: 'Registrar', value: domain.registrar ?? 'N/A' },
          { icon: Calendar, label: 'Expires', value: formatDate(domain.expiryDate) },
          { icon: DollarSign, label: 'Registration', value: formatMoneyFromCents(domain.registrationPrice, domain.currency ?? 'USD') },
          {
            icon: Globe,
            label: 'Days Left',
            value: expiryDays !== null
              ? expiryDays <= 0 ? `${Math.abs(expiryDays)}d overdue` : `${expiryDays} days`
              : '—',
          },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="pb-4 pt-4">
              <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-sm font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value)
        if (value === 'whois' && !whois) loadWhois(domain.name)
      }}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" /> {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-4">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renew {domain.name}</DialogTitle>
            <DialogDescription>
              A live price check runs before confirmation because Porkbun does not provide a sandbox for renewal billing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs">Years</Label>
                <select
                  value={renewForm.years}
                  onChange={(e) => setRenewForm((prev) => ({ ...prev, years: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((years) => (
                    <option key={years} value={years}>{years} year{years > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Currency</Label>
                <Input value={renewForm.currency} disabled className="h-9 text-sm" />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              {priceLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking live registrar pricing…
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live price check</p>
                  <p className="mt-1 text-sm font-semibold">{renewPrice?.exactUsdDisplay || formatMoneyFromCents(domain.renewalPrice, 'USD')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Source: {renewPrice?.source || 'domain snapshot'}.
                  </p>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
            <Button onClick={handleRenew} disabled={renewing || priceLoading}>
              {renewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <strong>{domain.name}</strong> as cancelled inside WHMS-fyp. The registrar account will not be touched automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Keep Domain</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Delete Domain
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
