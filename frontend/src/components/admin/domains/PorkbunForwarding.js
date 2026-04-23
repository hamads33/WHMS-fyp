'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2, Plus, Route, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  adminCreateDomainForwarding,
  adminDeleteDomainForwarding,
  adminGetDomainForwarding,
} from '@/lib/api/domain'
import { toastDomainError } from '@/lib/domain-error-toast'

export default function PorkbunForwarding({ domainId }) {
  const { toast } = useToast()
  const [forwards, setForwards] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ subdomain: '', location: '', type: 'permanent' })

  const loadForwards = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminGetDomainForwarding(domainId)
      setForwards(Array.isArray(res?.data) ? res.data : [])
    } catch (err) {
      toastDomainError(toast, err, 'Failed to load forwarding')
    } finally {
      setLoading(false)
    }
  }, [domainId, toast])

  useEffect(() => {
    loadForwards()
  }, [loadForwards])

  const handleCreate = async () => {
    try {
      setSaving(true)
      await adminCreateDomainForwarding(domainId, {
        ...form,
        includePath: 'yes',
        wildcard: 'no',
      })
      setForm({ subdomain: '', location: '', type: 'permanent' })
      toast({ title: 'Forwarding updated', description: 'The Porkbun redirect was created.' })
      await loadForwards()
    } catch (err) {
      toastDomainError(toast, err, 'Failed to create forwarding rule')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (forwardId) => {
    try {
      await adminDeleteDomainForwarding(domainId, forwardId)
      toast({ title: 'Forwarding updated', description: 'The redirect was removed.' })
      await loadForwards()
    } catch (err) {
      toastDomainError(toast, err, 'Failed to delete forwarding rule')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Create Redirect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-xs">Subdomain</Label>
              <Input
                value={form.subdomain}
                onChange={(e) => setForm((prev) => ({ ...prev, subdomain: e.target.value }))}
                placeholder="@"
                className="h-9 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs">Destination URL</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="https://example.com"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
            Add Redirect
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Redirect Rules ({forwards.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : forwards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Route className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No URL forwarding rules found.</p>
            </div>
          ) : (
            forwards.map((forward) => (
              <div key={forward.id} className="flex items-start justify-between rounded-lg border p-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{forward.subdomain || '@'}</p>
                  <a
                    href={forward.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {forward.location}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(forward.id)}>
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
