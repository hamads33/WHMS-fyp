// src/app/(admin)/admin/domains/[id]/page.js
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Trash2,
  Copy,
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
} from 'lucide-react'

import {
  adminGetDomainById,
  adminDeleteDomain,
  adminSyncDomain,
  getDnsRecords,
  addDnsRecord,
  deleteDnsRecord,
  getDomainLogs,
  formatDate,
  getStatusColor,
  getStatusLabel,
  daysUntilExpiry,
} from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'

export default function DomainDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [domain, setDomain] = useState(null)
  const [dnsRecords, setDnsRecords] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const [newDnsRecord, setNewDnsRecord] = useState({
    type: 'A',
    name: '',
    value: '',
    ttl: '3600',
  })
  const [addingDns, setAddingDns] = useState(false)

  /* ============================================
     Fetch Data
  ============================================ */
  useEffect(() => {
    if (id) fetchDomain()
  }, [id])

  const fetchDomain = async () => {
    try {
      setLoading(true)
      setError(null)

      const [domainRes, dnsRes, logsRes] = await Promise.all([
        adminGetDomainById(id),
        getDnsRecords(id),
        getDomainLogs(id),
      ])

      setDomain(domainRes?.data || null)
      setDnsRecords(Array.isArray(dnsRes?.data) ? dnsRes.data : [])
      setLogs(Array.isArray(logsRes?.data) ? logsRes.data : [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  /* ============================================
     Actions
  ============================================ */
  const handleCopy = (value, key) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleDelete = async () => {
    try {
      await adminDeleteDomain(id)
      router.push('/admin/domains')
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      await adminSyncDomain(id)
      await fetchDomain()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setSyncing(false)
    }
  }

  const handleAddDnsRecord = async () => {
    try {
      if (!newDnsRecord.name || !newDnsRecord.value) {
        alert('Please fill in name and value')
        return
      }

      setAddingDns(true)
      await addDnsRecord(id, {
        type: newDnsRecord.type,
        name: newDnsRecord.name,
        value: newDnsRecord.value,
        ttl: parseInt(newDnsRecord.ttl),
      })

      setNewDnsRecord({ type: 'A', name: '', value: '', ttl: '3600' })
      await fetchDomain()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setAddingDns(false)
    }
  }

  const handleDeleteDns = async (recordId) => {
    try {
      await deleteDnsRecord(id, recordId)
      await fetchDomain()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  /* ============================================
     Loading & Error
  ============================================ */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !domain) {
    return (
      <div className="space-y-6">
        <Link href="/admin/domains">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Domains
          </Button>
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Error Loading Domain</p>
              <p className="text-sm text-red-800">{error || 'Domain not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const expiryDays = daysUntilExpiry(domain.expiryDate)

  /* ============================================
     UI
  ============================================ */
  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/domains">
        <Button variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Domains
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{domain.name}</h1>
          <p className="text-muted-foreground text-sm">ID: {domain.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(domain.status)}>
              {getStatusLabel(domain.status)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Registrar</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold">
            {domain.registrar || 'N/A'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Expires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{formatDate(domain.expiryDate)}</div>
            <div className={`text-xs font-semibold ${
              expiryDays && expiryDays < 0
                ? 'text-red-600'
                : expiryDays && expiryDays <= 30
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}>
              {expiryDays !== null ? `${expiryDays} days left` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Auto-Renew</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={domain.autoRenew ? 'default' : 'outline'}>
              {domain.autoRenew ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="nameservers">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="nameservers">Nameservers</TabsTrigger>
          <TabsTrigger value="dns">DNS Records</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Nameservers Tab */}
        <TabsContent value="nameservers">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nameservers</CardTitle>
              <CardDescription>
                Current nameservers for this domain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {domain.nameservers && domain.nameservers.length > 0 ? (
                domain.nameservers.map((ns, i) => (
                  <div key={i} className="flex justify-between items-center bg-muted p-3 rounded">
                    <code className="text-sm">{ns}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(ns, `ns-${i}`)}
                    >
                      {copied === `ns-${i}` ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No nameservers configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DNS Records Tab */}
        <TabsContent value="dns">
          <div className="space-y-4">
            {/* Add DNS Record */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add DNS Record</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label htmlFor="type" className="text-sm">Type</Label>
                    <select
                      id="type"
                      value={newDnsRecord.type}
                      onChange={e =>
                        setNewDnsRecord({ ...newDnsRecord, type: e.target.value })
                      }
                      className="mt-1.5 w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option>A</option>
                      <option>AAAA</option>
                      <option>CNAME</option>
                      <option>MX</option>
                      <option>TXT</option>
                      <option>NS</option>
                      <option>SRV</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="name" className="text-sm">Name</Label>
                    <Input
                      id="name"
                      placeholder="@"
                      value={newDnsRecord.name}
                      onChange={e =>
                        setNewDnsRecord({ ...newDnsRecord, name: e.target.value })
                      }
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="value" className="text-sm">Value</Label>
                    <Input
                      id="value"
                      placeholder="1.1.1.1"
                      value={newDnsRecord.value}
                      onChange={e =>
                        setNewDnsRecord({ ...newDnsRecord, value: e.target.value })
                      }
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ttl" className="text-sm">TTL</Label>
                    <Input
                      id="ttl"
                      type="number"
                      value={newDnsRecord.ttl}
                      onChange={e =>
                        setNewDnsRecord({ ...newDnsRecord, ttl: e.target.value })
                      }
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddDnsRecord}
                  disabled={addingDns}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {addingDns ? 'Adding...' : 'Add Record'}
                </Button>
              </CardContent>
            </Card>

            {/* DNS Records List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">DNS Records ({dnsRecords.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {dnsRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>TTL</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dnsRecords.map(record => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <Badge variant="outline">{record.type}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{record.name}</TableCell>
                            <TableCell className="font-mono text-sm max-w-xs truncate">
                              {record.value}
                            </TableCell>
                            <TableCell className="text-sm">{record.ttl}</TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteDns(record.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No DNS records found
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Domain Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Domain Name</label>
                    <p className="mt-1 font-mono text-sm">{domain.name}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Owner ID</label>
                    <p className="mt-1 font-mono text-sm">{domain.ownerId || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Registrar</label>
                    <p className="mt-1 text-sm">{domain.registrar || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="mt-1 text-sm">
                      <Badge className={getStatusColor(domain.status)}>
                        {getStatusLabel(domain.status)}
                      </Badge>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Registration Date</label>
                    <p className="mt-1 text-sm">{formatDate(domain.createdAt)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Expiry Date</label>
                    <p className="mt-1 text-sm">{formatDate(domain.expiryDate)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Registration Price</label>
                    <p className="mt-1 text-sm">{domain.registrationPrice || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Currency</label>
                    <p className="mt-1 text-sm">{domain.currency || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Logs</CardTitle>
              <CardDescription>Recent actions on this domain</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm capitalize">
                            {log.action?.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                      </div>
                      {log.meta && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No logs available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{domain.name}</strong>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600"
            onClick={handleDelete}
          >
            Delete Domain
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}