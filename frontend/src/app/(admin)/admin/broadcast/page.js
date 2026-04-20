'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, Send, Upload, Bell, FileText, Clock, Users, AlertTriangle, Info, Zap, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react'
import { AdminBroadcastAPI } from '@/lib/api/broadcast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const TARGET_OPTIONS = ['ALL', 'CLIENTS', 'STAFF', 'DEVELOPERS']
const SEVERITY_OPTIONS = ['INFO', 'WARNING', 'CRITICAL']

// ── Utilities ──────────────────────────────────────────────────────────────

function toDatetimeLocalMin(date) {
  const d = new Date(date.getTime() + 60000) // 1-min buffer
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusBadge(status) {
  const map = {
    Live:      'border-border text-foreground bg-secondary',
    Scheduled: 'border-border text-muted-foreground',
    Expired:   'border-border text-muted-foreground',
    Inactive:  'border-destructive/30 bg-destructive/10 text-destructive',
  }
  return <Badge variant="outline" className={map[status] || 'border-border text-muted-foreground'}>{status}</Badge>
}

function severityIcon(severity) {
  if (severity === 'CRITICAL') return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
  if (severity === 'WARNING')  return <Zap className="h-3.5 w-3.5 text-muted-foreground" />
  return <Info className="h-3.5 w-3.5 text-muted-foreground" />
}

// ── useSystemTime hook ─────────────────────────────────────────────────────

function useSystemTime() {
  const [source, setSource] = useState('loading') // 'loading' | 'auto' | 'manual'
  const [capturedAt, setCapturedAt] = useState(null)
  const [baseMs, setBaseMs] = useState(null)
  const [manualInput, setManualInput] = useState('')

  const fetchTime = useCallback(() => {
    setSource('loading')
    const start = Date.now()
    AdminBroadcastAPI.getServerTime()
      .then(res => {
        setBaseMs(new Date(res.data.time).getTime())
        setCapturedAt(start)
        setSource('auto')
      })
      .catch(() => {
        setSource('manual')
      })
  }, [])

  useEffect(() => { fetchTime() }, [fetchTime])

  function getNow() {
    if (baseMs !== null && capturedAt !== null) {
      return new Date(baseMs + (Date.now() - capturedAt))
    }
    return new Date()
  }

  function applyManual(isoString) {
    const ms = new Date(isoString).getTime()
    if (!isNaN(ms)) {
      setBaseMs(ms)
      setCapturedAt(Date.now())
      setManualInput('')
      setSource('auto')
    }
  }

  return { source, getNow, manualInput, setManualInput, applyManual, refresh: fetchTime }
}

// ── SystemTimeBanner ───────────────────────────────────────────────────────

function SystemTimeBanner({ st }) {
  const { source, getNow, manualInput, setManualInput, applyManual, refresh } = st
  const [, setTick] = useState(0)

  useEffect(() => {
    if (source !== 'auto') return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [source])

  if (source === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 border border-border rounded-lg">
        <Clock className="h-4 w-4 animate-pulse" />
        Detecting system time…
      </div>
    )
  }

  if (source === 'manual') {
    return (
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Could not auto-detect server time
        </div>
        <p className="text-xs text-muted-foreground">
          Set the current date and time manually to enable schedule validation.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="datetime-local"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyManual(manualInput)}
            disabled={!manualInput}
          >
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} title="Retry auto-detect">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // source === 'auto'
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2 border border-border rounded-lg">
      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
      <span>
        System time: <span className="font-medium text-foreground">{getNow().toLocaleString()}</span>
      </span>
      <button onClick={refresh} className="ml-auto hover:text-foreground transition-colors" title="Refresh time">
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  )
}

// ── Notifications Tab ──────────────────────────────────────────────────────

function NotificationsTab({ st }) {
  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const [title, setTitle]               = useState('')
  const [content, setContent]           = useState('')
  const [targetAudience, setTarget]     = useState('ALL')
  const [severity, setSeverity]         = useState('INFO')
  const [isDismissible, setDismissible] = useState(true)
  const [scheduleType, setScheduleType] = useState('immediate')
  const [publishAt, setPublishAt]       = useState('')
  const [expiresAt, setExpiresAt]       = useState('')

  useEffect(() => { loadList() }, [])

  async function loadList() {
    setLoading(true)
    try {
      const res = await AdminBroadcastAPI.list({ type: 'NOTIFICATION' })
      setBroadcasts(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTitle(''); setContent(''); setTarget('ALL')
    setSeverity('INFO'); setDismissible(true)
    setScheduleType('immediate'); setPublishAt(''); setExpiresAt('')
  }

  function validateDates() {
    const now = st.getNow()

    if (scheduleType === 'scheduled') {
      if (!publishAt) return 'Publish date is required for scheduled notifications'
      const pub = new Date(publishAt)
      if (pub <= now) return `Publish date must be in the future (current time: ${now.toLocaleString()})`
    }

    if (expiresAt) {
      const exp = new Date(expiresAt)
      if (exp <= now) return `Expiry date must be in the future (current time: ${now.toLocaleString()})`
      if (scheduleType === 'scheduled' && publishAt && exp <= new Date(publishAt)) {
        return 'Expiry date must be after the publish date'
      }
    }

    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const dateError = validateDates()
    if (dateError) { setError(dateError); return }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('type', 'NOTIFICATION')
      fd.append('title', title)
      if (content) fd.append('content', content)
      fd.append('targetAudience', targetAudience)
      fd.append('severity', severity)
      fd.append('isDismissible', isDismissible)
      if (scheduleType === 'scheduled' && publishAt) fd.append('publishAt', publishAt)
      if (expiresAt) fd.append('expiresAt', expiresAt)
      await AdminBroadcastAPI.create(fd)
      resetForm()
      loadList()
    } catch (err) {
      setError(err.message || 'Failed to publish notification')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deactivate this notification?')) return
    try {
      await AdminBroadcastAPI.delete(id)
      setBroadcasts(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const nowMin = st.source !== 'loading' ? toDatetimeLocalMin(st.getNow()) : undefined

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

      {/* ── Create Form ── */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> New Notification
          </CardTitle>
          <CardDescription>Publish a notification to users</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <SystemTimeBanner st={st} />

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="n-title">Title *</Label>
              <Input id="n-title" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Notification title" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="n-content">Message</Label>
              <Textarea id="n-content" value={content} onChange={e => setContent(e.target.value)}
                placeholder="Notification body (optional)" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTarget}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="n-dismiss" checked={isDismissible} onCheckedChange={setDismissible} />
              <Label htmlFor="n-dismiss" className="font-normal text-sm">Allow users to dismiss</Label>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Schedule</Label>
              <div className="flex gap-2">
                {['immediate', 'scheduled'].map(s => (
                  <button key={s} type="button" onClick={() => setScheduleType(s)}
                    className={`flex-1 px-3 py-1.5 rounded border text-sm transition ${
                      scheduleType === s
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}>
                    {s === 'immediate' ? 'Immediate' : 'Scheduled'}
                  </button>
                ))}
              </div>
            </div>

            {scheduleType === 'scheduled' && (
              <div className="space-y-1.5">
                <Label htmlFor="n-publish">Publish At *</Label>
                <Input id="n-publish" type="datetime-local" value={publishAt}
                  min={nowMin}
                  onChange={e => setPublishAt(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Must be a future date and time</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="n-expires">Expires At <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="n-expires" type="datetime-local" value={expiresAt}
                min={scheduleType === 'scheduled' && publishAt ? publishAt : nowMin}
                onChange={e => setExpiresAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">Must be a future date and time</p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Publishing…' : 'Publish Notification'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── List ── */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Active Notifications</CardTitle>
          <CardDescription>{broadcasts.length} notification{broadcasts.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
              <Bell className="h-8 w-8 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {broadcasts.map(b => (
                <div key={b.id} className="flex items-start justify-between px-6 py-4 hover:bg-muted/30">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{severityIcon(b.severity)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.title}</p>
                      {b.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.content}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {statusBadge(b.status)}
                        <Badge variant="outline" className="text-xs">{b.targetAudience}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="shrink-0 ml-2">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

// ── Documents Tab ──────────────────────────────────────────────────────────

function DocumentsTab({ st }) {
  const [documents, setDocuments]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const [title, setTitle]           = useState('')
  const [file, setFile]             = useState(null)
  const [targetAudience, setTarget] = useState('ALL')
  const [scheduleType, setScheduleType] = useState('immediate')
  const [publishAt, setPublishAt]   = useState('')
  const [expiresAt, setExpiresAt]   = useState('')

  useEffect(() => { loadList() }, [])

  async function loadList() {
    setLoading(true)
    try {
      const res = await AdminBroadcastAPI.list({ type: 'DOCUMENT' })
      setDocuments(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTitle(''); setFile(null); setTarget('ALL')
    setScheduleType('immediate'); setPublishAt(''); setExpiresAt('')
    const el = document.getElementById('doc-file')
    if (el) el.value = ''
  }

  function validateDates() {
    const now = st.getNow()

    if (scheduleType === 'scheduled') {
      if (!publishAt) return 'Publish date is required for scheduled documents'
      const pub = new Date(publishAt)
      if (pub <= now) return `Publish date must be in the future (current time: ${now.toLocaleString()})`
    }

    if (expiresAt) {
      const exp = new Date(expiresAt)
      if (exp <= now) return `Expiry date must be in the future (current time: ${now.toLocaleString()})`
      if (scheduleType === 'scheduled' && publishAt && exp <= new Date(publishAt)) {
        return 'Expiry date must be after the publish date'
      }
    }

    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const dateError = validateDates()
    if (dateError) { setError(dateError); return }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('type', 'DOCUMENT')
      fd.append('title', title)
      fd.append('targetAudience', targetAudience)
      if (scheduleType === 'scheduled' && publishAt) fd.append('publishAt', publishAt)
      if (expiresAt) fd.append('expiresAt', expiresAt)
      if (file) fd.append('file', file)
      await AdminBroadcastAPI.create(fd)
      resetForm()
      loadList()
    } catch (err) {
      setError(err.message || 'Failed to publish document')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deactivate this document?')) return
    try {
      await AdminBroadcastAPI.delete(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const nowMin = st.source !== 'loading' ? toDatetimeLocalMin(st.getNow()) : undefined

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

      {/* ── Upload Form ── */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Publish Document
          </CardTitle>
          <CardDescription>Upload and publish a document to users</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <SystemTimeBanner st={st} />

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title *</Label>
              <Input id="doc-title" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Document title" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-file">File *</Label>
              <Input id="doc-file" type="file"
                onChange={e => setFile(e.target.files?.[0])}
                accept=".pdf,.docx,.xlsx,.zip,.png,.jpg,.gif"
                required />
              <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, ZIP, PNG, JPG — max 50 MB</p>
            </div>

            <div className="space-y-1.5">
              <Label>Target Audience</Label>
              <Select value={targetAudience} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Schedule</Label>
              <div className="flex gap-2">
                {['immediate', 'scheduled'].map(s => (
                  <button key={s} type="button" onClick={() => setScheduleType(s)}
                    className={`flex-1 px-3 py-1.5 rounded border text-sm transition ${
                      scheduleType === s
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}>
                    {s === 'immediate' ? 'Immediate' : 'Scheduled'}
                  </button>
                ))}
              </div>
            </div>

            {scheduleType === 'scheduled' && (
              <div className="space-y-1.5">
                <Label htmlFor="doc-publish">Publish At *</Label>
                <Input id="doc-publish" type="datetime-local" value={publishAt}
                  min={nowMin}
                  onChange={e => setPublishAt(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Must be a future date and time</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="doc-expires">Expires At <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="doc-expires" type="datetime-local" value={expiresAt}
                min={scheduleType === 'scheduled' && publishAt ? publishAt : nowMin}
                onChange={e => setExpiresAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">Must be a future date and time</p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              <Upload className="h-4 w-4 mr-2" />
              {submitting ? 'Publishing…' : 'Publish Document'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── List ── */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Published Documents</CardTitle>
          <CardDescription>{documents.length} document{documents.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
              <FileText className="h-8 w-8 opacity-30" />
              <p className="text-sm">No documents published yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {documents.map(d => (
                <div key={d.id} className="flex items-start justify-between px-6 py-4 hover:bg-muted/30">
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {d.fileOriginalName && (
                          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {d.fileOriginalName}
                          </span>
                        )}
                        {d.fileSize && (
                          <span className="text-xs text-muted-foreground">{formatSize(d.fileSize)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {statusBadge(d.status)}
                        <Badge variant="outline" className="text-xs">{d.targetAudience}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {d.engagementStats?.downloads || 0} downloads
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} className="shrink-0 ml-2">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function BroadcastPage() {
  const st = useSystemTime()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Broadcast</h1>
          <p className="text-muted-foreground text-sm mt-1">Publish notifications and documents to users</p>
        </div>
      </div>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-6">
          <NotificationsTab st={st} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab st={st} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
