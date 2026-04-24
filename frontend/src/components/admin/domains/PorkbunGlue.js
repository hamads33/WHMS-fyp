'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Plus, Trash2, Waypoints } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  adminCreateDomainGlue,
  adminDeleteDomainGlue,
  adminGetDomainGlue,
} from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'
import { toastDomainError } from '@/lib/domain-error-toast'

export default function PorkbunGlue({ domainId }) {
  const { toast } = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ subdomain: '', ips: '' })

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminGetDomainGlue(domainId)
      setRecords(Array.isArray(res?.data?.hosts) ? res.data.hosts : [])
    } catch (err) {
      setError(getErrorMessage(err))
      toastDomainError(toast, err, 'Failed to load glue records')
    } finally {
      setLoading(false)
    }
  }, [domainId, toast])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleCreate = async () => {
    try {
      setSaving(true)
      setError(null)
      await adminCreateDomainGlue(domainId, {
        subdomain: form.subdomain.trim(),
        ips: form.ips.split('\n').map((ip) => ip.trim()).filter(Boolean),
      })
      setForm({ subdomain: '', ips: '' })
      toast({ title: 'Glue updated', description: 'The Porkbun host record was saved.' })
      await loadRecords()
    } catch (err) {
      setError(getErrorMessage(err))
      toastDomainError(toast, err, 'Failed to save glue record')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (subdomain) => {
    try {
      await adminDeleteDomainGlue(domainId, subdomain)
      toast({ title: 'Glue updated', description: `Deleted ${subdomain}.` })
      await loadRecords()
    } catch (err) {
      toastDomainError(toast, err, 'Failed to delete glue record')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Create Glue Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs">Subdomain</Label>
              <Input
                value={form.subdomain}
                onChange={(e) => setForm((prev) => ({ ...prev, subdomain: e.target.value }))}
                placeholder="ns1"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">IP addresses</Label>
              <textarea
                value={form.ips}
                onChange={(e) => setForm((prev) => ({ ...prev, ips: e.target.value }))}
                placeholder={'198.51.100.10\n2001:db8::10'}
                className="min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            Save Glue Record
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Glue Hosts ({records.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Waypoints className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No glue records configured.</p>
            </div>
          ) : (
            records.map((record) => (
              <div key={record.hostname} className="flex items-start justify-between rounded-lg border p-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{record.hostname}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[...(record.ipv4 || []), ...(record.ipv6 || [])].join(', ') || 'No addresses'}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(record.subdomain || record.hostname)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
