'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Server, Globe, Database, Mail, ShieldCheck, RefreshCw,
  Loader2, Plus, HardDrive, Clock, ExternalLink, FolderSync,
} from 'lucide-react'
import { ClientProvisioningAPI } from '@/lib/api/provisioning'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

function statusBadge(status) {
  const map = {
    active: 'bg-green-100 text-green-700 border-green-200',
    suspended: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    pending: 'bg-blue-100 text-blue-700 border-blue-200',
    deleted: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <Badge variant="outline" className={`capitalize ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status ?? 'unknown'}
    </Badge>
  )
}

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDisk(value) {
  if (value == null) return '—'
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`
  return `${value} MB`
}

function SummaryCard({ title, value, subtitle, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1.5 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
        </div>
        <div className="rounded-xl bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )
}

function HostingAccountDialog({ account, onClose, onRefresh }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState('')
  const [domainForm, setDomainForm] = useState({ domain: '', phpVersion: '8.1' })
  const [emailForm, setEmailForm] = useState({ domain: '', account: '', password: '' })
  const [dbForm, setDbForm] = useState({ domain: '', name: '', user: '', password: '' })
  const [sslDomain, setSslDomain] = useState('')

  async function run(action, task, successMessage, reset) {
    setBusy(task)
    try {
      await action()
      toast({ title: successMessage })
      reset?.()
      await onRefresh()
    } catch (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' })
    } finally {
      setBusy('')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            {account.username}
            {statusBadge(account.status)}
          </DialogTitle>
          <DialogDescription>
            Manage domains, databases, mailboxes, SSL, and usage for this hosting account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Domains" value={account.domains?.length ?? 0} icon={Globe} />
          <SummaryCard title="Databases" value={account.databases?.length ?? 0} icon={Database} />
          <SummaryCard title="Emails" value={account.emails?.length ?? 0} icon={Mail} />
          <SummaryCard title="Disk Usage" value={fmtDisk(account.diskUsedMB)} icon={HardDrive} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="ssl">SSL</TabsTrigger>
            <TabsTrigger value="databases">Databases</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Username', account.username],
                ['Control Panel', account.controlPanel],
                ['Status', account.status],
                ['Provisioned', fmtDate(account.provisionedAt)],
                ['Last Sync', fmtDate(account.lastSyncedAt)],
                ['Bandwidth', account.bandwidthUsedGB != null ? `${account.bandwidthUsedGB} GB` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => run(() => ClientProvisioningAPI.syncAccount(account.username), 'sync', 'Usage synced', null)}
                disabled={busy === 'sync'}
              >
                {busy === 'sync' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FolderSync className="h-4 w-4 mr-1.5" />}
                Sync Usage
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="domains" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connected Domains</CardTitle>
              </CardHeader>
              <CardContent>
                {account.domains?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>SSL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.domains.map((domain) => (
                        <TableRow key={domain.id}>
                          <TableCell className="font-mono text-sm">{domain.domain}</TableCell>
                          <TableCell>{statusBadge(domain.status)}</TableCell>
                          <TableCell>
                            {domain.sslStatus === 'active' ? (
                              <span className="text-xs text-green-600 inline-flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not installed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No domains connected yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Domain</CardTitle>
                <CardDescription>Provision an additional site under this hosting account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Domain</Label>
                    <Input value={domainForm.domain} onChange={(e) => setDomainForm((p) => ({ ...p, domain: e.target.value }))} placeholder="example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>PHP Version</Label>
                    <Input value={domainForm.phpVersion} onChange={(e) => setDomainForm((p) => ({ ...p, phpVersion: e.target.value }))} placeholder="8.1" />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => run(
                    () => ClientProvisioningAPI.createDomain(account.username, domainForm),
                    'domain',
                    'Domain added',
                    () => setDomainForm({ domain: '', phpVersion: '8.1' })
                  )}
                  disabled={busy === 'domain' || !domainForm.domain}
                >
                  {busy === 'domain' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                  Add Domain
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ssl" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Issue SSL Certificate</CardTitle>
                <CardDescription>Install or renew Let&apos;s Encrypt SSL for one of your domains.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Domain</Label>
                  <Input value={sslDomain} onChange={(e) => setSslDomain(e.target.value)} placeholder="example.com" />
                </div>
                <Button
                  size="sm"
                  onClick={() => run(
                    () => ClientProvisioningAPI.issueSSL(account.username, sslDomain),
                    'ssl',
                    'SSL installed',
                    () => setSslDomain('')
                  )}
                  disabled={busy === 'ssl' || !sslDomain}
                >
                  {busy === 'ssl' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                  Install SSL
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="databases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Databases</CardTitle>
              </CardHeader>
              <CardContent>
                {account.databases?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.databases.map((db) => (
                        <TableRow key={db.id}>
                          <TableCell className="font-mono text-sm">{db.name}</TableCell>
                          <TableCell className="font-mono text-sm">{db.dbUser}</TableCell>
                          <TableCell>{statusBadge(db.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No databases created yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Database</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Domain</Label>
                    <Input value={dbForm.domain} onChange={(e) => setDbForm((p) => ({ ...p, domain: e.target.value }))} placeholder="example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Database Name</Label>
                    <Input value={dbForm.name} onChange={(e) => setDbForm((p) => ({ ...p, name: e.target.value }))} placeholder="appdb" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Database User</Label>
                    <Input value={dbForm.user} onChange={(e) => setDbForm((p) => ({ ...p, user: e.target.value }))} placeholder="appuser" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input type="password" value={dbForm.password} onChange={(e) => setDbForm((p) => ({ ...p, password: e.target.value }))} placeholder="Strong password" />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => run(
                    () => ClientProvisioningAPI.createDatabase(account.username, {
                      ...dbForm,
                      user: dbForm.user || dbForm.name,
                    }),
                    'database',
                    'Database created',
                    () => setDbForm({ domain: '', name: '', user: '', password: '' })
                  )}
                  disabled={busy === 'database' || !dbForm.domain || !dbForm.name}
                >
                  {busy === 'database' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Database className="h-4 w-4 mr-1.5" />}
                  Create Database
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mailboxes</CardTitle>
              </CardHeader>
              <CardContent>
                {account.emails?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Quota</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.emails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-mono text-sm">{email.email}</TableCell>
                          <TableCell>{email.quota} MB</TableCell>
                          <TableCell>{statusBadge(email.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No mailboxes created yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Mailbox</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Domain</Label>
                    <Input value={emailForm.domain} onChange={(e) => setEmailForm((p) => ({ ...p, domain: e.target.value }))} placeholder="example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mailbox User</Label>
                    <Input value={emailForm.account} onChange={(e) => setEmailForm((p) => ({ ...p, account: e.target.value }))} placeholder="support" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Password</Label>
                    <Input type="password" value={emailForm.password} onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))} placeholder="Strong password" />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => run(
                    () => ClientProvisioningAPI.createEmail(account.username, emailForm),
                    'email',
                    'Mailbox created',
                    () => setEmailForm({ domain: '', account: '', password: '' })
                  )}
                  disabled={busy === 'email' || !emailForm.domain || !emailForm.account}
                >
                  {busy === 'email' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />}
                  Create Mailbox
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function HostingContent() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await ClientProvisioningAPI.listAccounts()
      setAccounts(Array.isArray(data) ? data : [])
    } catch (error) {
      toast({ title: 'Failed to load hosting accounts', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => {
    const domains = accounts.flatMap((account) => account.domains ?? [])
    const databases = accounts.flatMap((account) => account.databases ?? [])
    const emails = accounts.flatMap((account) => account.emails ?? [])
    const secureDomains = domains.filter((domain) => domain.sslStatus === 'active').length

    return {
      accounts: accounts.length,
      domains: domains.length,
      databases: databases.length,
      emails: emails.length,
      secureDomains,
    }
  }, [accounts])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hosting</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your websites, SSL certificates, mailboxes, and databases from one place.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Accounts" value={summary.accounts} subtitle="Provisioned hosting plans" icon={Server} />
        <SummaryCard title="Domains" value={summary.domains} subtitle="Websites under management" icon={Globe} />
        <SummaryCard title="SSL Active" value={summary.secureDomains} subtitle="Secured domains" icon={ShieldCheck} />
        <SummaryCard title="Databases" value={summary.databases} subtitle="MySQL resources" icon={Database} />
        <SummaryCard title="Mailboxes" value={summary.emails} subtitle="Email accounts" icon={Mail} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Hosting Accounts</CardTitle>
          <CardDescription>Open any account to manage domains, SSL, databases, mailboxes, and usage.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading hosting accounts…
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Server className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hosting accounts yet</p>
              <p className="text-sm mt-1">Your active hosting services will appear here after provisioning.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {accounts.map((account) => (
                <Card key={account.id} className="border-border/70">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{account.username}</p>
                        <p className="text-xs text-muted-foreground mt-1">{account.controlPanel} account</p>
                      </div>
                      {statusBadge(account.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Domains</p>
                        <p className="font-semibold mt-1">{account.domains?.length ?? 0}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Disk Used</p>
                        <p className="font-semibold mt-1">{fmtDisk(account.diskUsedMB)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Provisioned</p>
                        <p className="font-semibold mt-1 inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {fmtDate(account.provisionedAt)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Last Sync</p>
                        <p className="font-semibold mt-1">{fmtDate(account.lastSyncedAt)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => setSelected(account)}>
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Manage Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <HostingAccountDialog
          account={selected}
          onClose={() => setSelected(null)}
          onRefresh={async () => {
            await load()
            try {
              const fresh = await ClientProvisioningAPI.getAccount(selected.username)
              setSelected(fresh)
            } catch {
              setSelected(null)
            }
          }}
        />
      )}
    </div>
  )
}
