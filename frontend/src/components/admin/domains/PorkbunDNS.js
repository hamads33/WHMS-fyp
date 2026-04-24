'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Plus, Server, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  adminCreateDomainDns,
  adminDeleteDomainDns,
  adminGetDomainDns,
} from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'
import { toastDomainError } from '@/lib/domain-error-toast'

const DNS_TYPE_COLORS = {
  A: 'bg-muted text-muted-foreground',
  AAAA: 'bg-muted text-muted-foreground',
  CNAME: 'bg-muted text-muted-foreground',
  MX: 'bg-muted text-muted-foreground',
  TXT: 'bg-muted text-muted-foreground',
  NS: 'bg-muted text-muted-foreground',
  SRV: 'bg-muted text-muted-foreground',
}

export default function PorkbunDNS({ domainId }) {
  const { toast } = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ type: 'A', name: '', content: '', ttl: '600' })

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await adminGetDomainDns(domainId)
      setRecords(Array.isArray(res?.data?.records) ? res.data.records : [])
    } catch (err) {
      setError(getErrorMessage(err))
      toastDomainError(toast, err, 'Failed to load DNS')
    } finally {
      setLoading(false)
    }
  }, [domainId, toast])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleCreate = async () => {
    if (!form.content.trim()) {
      setError('Record content is required')
      return
    }

    try {
      setSaving(true)
      setError(null)
      await adminCreateDomainDns(domainId, {
        type: form.type,
        name: form.name.trim(),
        content: form.content.trim(),
        ttl: Number(form.ttl) || 600,
      })
      setForm({ type: 'A', name: '', content: '', ttl: '600' })
      toast({ title: 'DNS updated', description: 'The new Porkbun DNS record was added.' })
      await loadRecords()
    } catch (err) {
      setError(getErrorMessage(err))
      toastDomainError(toast, err, 'Failed to save DNS record')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (recordId) => {
    try {
      await adminDeleteDomainDns(domainId, recordId)
      toast({ title: 'DNS updated', description: 'The Porkbun DNS record was removed.' })
      await loadRecords()
    } catch (err) {
      toastDomainError(toast, err, 'Failed to delete DNS record')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Add DNS Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label className="mb-1.5 block text-xs">Type</Label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Host</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="@"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Content</Label>
              <Input
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="1.1.1.1"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">TTL</Label>
              <Input
                type="number"
                value={form.ttl}
                onChange={(e) => setForm((prev) => ({ ...prev, ttl: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>
          {error && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />{error}
            </p>
          )}
          <Button onClick={handleCreate} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
            Add Record
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Live DNS Records ({records.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Server className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No Porkbun DNS records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Type</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="hidden sm:table-cell">TTL</TableHead>
                    <TableHead className="w-10 pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="group">
                      <TableCell className="pl-5">
                        <Badge variant="secondary" className={DNS_TYPE_COLORS[record.type] ?? 'bg-muted text-muted-foreground'}>
                          {record.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.name || '@'}</TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-sm text-muted-foreground">{record.content}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{record.ttl}s</TableCell>
                      <TableCell className="pr-5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          onClick={() => handleDelete(record.id)}
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
    </div>
  )
}
