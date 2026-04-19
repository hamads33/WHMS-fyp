'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle,
  Globe, Search, User, Server, Tag, ChevronRight,
} from 'lucide-react'

import { checkDomainAvailability, registerDomain } from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'

/* ── step indicator ─────────────────────────────────────── */
function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'idle'
        return (
          <div key={i} className="flex items-center">
            <div className={`flex items-center gap-2 px-1 ${state === 'idle' ? 'opacity-40' : ''}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors
                ${state === 'done' ? 'bg-primary border-primary text-primary-foreground'
                  : state === 'active' ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground'}`}>
                {state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${state === 'active' ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 mx-1" />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── contact form ───────────────────────────────────────── */
function ContactFields({ label, data, onChange }) {
  const fields = [
    { key: 'name',    label: 'Full Name *',     type: 'text',  placeholder: 'John Doe' },
    { key: 'email',   label: 'Email *',         type: 'email', placeholder: 'john@example.com' },
    { key: 'phone',   label: 'Phone',           type: 'tel',   placeholder: '+1 555 000 0000' },
    { key: 'country', label: 'Country Code',    type: 'text',  placeholder: 'US' },
  ]
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(f => (
          <div key={f.key}>
            <Label className="text-xs mb-1.5 block">{f.label}</Label>
            <Input
              type={f.type}
              placeholder={f.placeholder}
              value={data[f.key]}
              onChange={e => onChange(f.key, e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── page ─────────────────────────────────────────────── */
export default function RegisterDomainPage() {
  const router = useRouter()

  const [domain,       setDomain]       = useState('')
  const [registrar,    setRegistrar]    = useState('mock')
  const [checking,     setChecking]     = useState(false)
  const [availability, setAvailability] = useState(null)
  const [activeStep,   setActiveStep]   = useState(0)

  const [formData, setFormData] = useState({
    years: '1', currency: 'USD', ownerId: '',
    nameservers: ['', ''],
    contacts: {
      registrant: { name: '', email: '', phone: '', country: 'US' },
      admin:      { name: '', email: '', phone: '', country: 'US' },
    },
  })

  const [registering, setRegistering] = useState(false)
  const [error,       setError]       = useState(null)
  const [success,     setSuccess]     = useState(null)
  const [mockWarning, setMockWarning] = useState(null)

  const STEPS = ['Check Availability', 'Basic Info', 'Nameservers', 'Contacts & Register']

  const handleCheck = async () => {
    if (!domain || !domain.includes('.')) { setError('Enter a valid domain (e.g. example.com)'); return }
    try {
      setChecking(true); setError(null); setAvailability(null); setMockWarning(null)
      const res = await checkDomainAvailability(domain, registrar)
      setAvailability(res?.data ?? null)
      if (res?.data?.isMock || res?.data?.warning) {
        setMockWarning(res.data.warning || 'Using mock registrar — results are simulated.')
      }
      if (res?.data?.available) setActiveStep(1)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setChecking(false) }
  }

  const handleRegister = async () => {
    const { contacts, ownerId } = formData
    if (!availability?.available) { setError('Domain is not available'); return }
    if (!ownerId.trim()) { setError('Owner ID is required'); return }
    if (!contacts.registrant.name || !contacts.registrant.email) { setError('Registrant name and email are required'); return }
    if (!contacts.admin.name || !contacts.admin.email) { setError('Admin name and email are required'); return }

    try {
      setRegistering(true); setError(null); setMockWarning(null)
      const result = await registerDomain({
        domain, registrar,
        ownerId: formData.ownerId,
        years: parseInt(formData.years),
        currency: formData.currency,
        nameservers: formData.nameservers.filter(ns => ns.trim()),
        contacts: [
          { ...contacts.registrant, type: 'registrant' },
          { ...contacts.admin,      type: 'admin' },
        ],
      })
      if (result?.isMock || result?.warning) {
        setMockWarning(result.warning || 'Domain registered with mock registrar — for testing only, not a real domain.')
      }
      setSuccess(`${domain} registered successfully!`)
      setTimeout(() => router.push('/admin/domains'), 2000)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setRegistering(false) }
  }

  const updateContact = (type, field, value) =>
    setFormData(f => ({ ...f, contacts: { ...f.contacts, [type]: { ...f.contacts[type], [field]: value } } }))

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link href="/admin/domains">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All Domains
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Register Domain</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Check availability and complete registration in one flow</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} current={activeStep} />

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/50 text-destructive rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 bg-accent/10 border border-accent/50 text-accent rounded-lg p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success} Redirecting…</span>
        </div>
      )}

      {/* ── Step 0: Check Availability ─────────────────── */}
      <Card className={activeStep !== 0 && availability?.available ? 'border-accent/50 bg-accent/5' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" /> Step 1 — Check Availability
            </CardTitle>
            {availability?.available && activeStep > 0 && (
              <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Available
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label className="text-xs mb-1.5 block">Domain Name</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="example.com"
                  value={domain}
                  onChange={e => { setDomain(e.target.value.toLowerCase()); setAvailability(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleCheck()}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Registrar</Label>
              <select
                value={registrar}
                onChange={e => setRegistrar(e.target.value)}
                className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
              >
                <option value="mock">Mock (Testing)</option>
                <option value="namecheap">Namecheap</option>
                <option value="porkbun">Porkbun</option>
              </select>
              {registrar === "mock" && (
                <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">Mock mode — no real domain will be registered.</p>
              )}
            </div>
            <div className="flex items-end">
              <Button onClick={handleCheck} disabled={checking} className="w-full h-9">
                {checking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                {checking ? 'Checking…' : 'Check'}
              </Button>
            </div>
          </div>

          {availability && (
            <div className={`rounded-lg border-2 p-4 flex items-start gap-3 ${
              availability.available
                ? 'border-accent/50 bg-accent/5'
                : 'border-destructive/50 bg-destructive/10'
            }`}>
              {availability.available
                ? <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
              <div>
                <p className={`font-semibold text-sm ${availability.available ? 'text-accent' : 'text-destructive'}`}>
                  {availability.available ? `${domain} is available!` : `${domain} is not available`}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {availability.premium && <Badge variant="outline" className="text-xs">Premium Domain</Badge>}
                  {availability.price && (
                    <span className="text-xs text-muted-foreground">
                      Registration price: <strong className="text-foreground">${availability.price}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {mockWarning && (
            <div className="flex items-start gap-2.5 rounded-lg border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{mockWarning}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Steps 1-3 (visible only when domain is available) ── */}
      {availability?.available && (
        <div className="space-y-4">
          {/* ── Step 1: Basic Info ─────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" /> Step 2 — Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Owner ID *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="user-id-here"
                      value={formData.ownerId}
                      onChange={e => setFormData(f => ({ ...f, ownerId: e.target.value }))}
                      className="pl-9 h-9 text-sm font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">User ID of the domain owner</p>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Registration Period</Label>
                  <select
                    value={formData.years}
                    onChange={e => setFormData(f => ({ ...f, years: e.target.value }))}
                    className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(y => <option key={y} value={y}>{y} year{y !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Currency</Label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData(f => ({ ...f, currency: e.target.value }))}
                    className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
                  >
                    {['USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Step 2: Nameservers ────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" /> Step 3 — Nameservers
                <Badge variant="outline" className="text-xs ml-1">Optional</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Leave blank to use the registrar's default nameservers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map(i => (
                  <div key={i}>
                    <Label className="text-xs mb-1.5 block">Nameserver {i + 1}</Label>
                    <Input
                      placeholder={i === 0 ? 'ns1.example.com' : 'ns2.example.com'}
                      value={formData.nameservers[i] || ''}
                      onChange={e => {
                        const ns = [...formData.nameservers]
                        ns[i] = e.target.value
                        setFormData(f => ({ ...f, nameservers: ns }))
                      }}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Step 3: Contacts ───────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" /> Step 4 — WHOIS Contacts
              </CardTitle>
              <CardDescription className="text-xs">Registrant and admin contacts are required by ICANN</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ContactFields
                label="Registrant Contact"
                data={formData.contacts.registrant}
                onChange={(f, v) => updateContact('registrant', f, v)}
              />
              <Separator />
              <ContactFields
                label="Admin Contact"
                data={formData.contacts.admin}
                onChange={(f, v) => updateContact('admin', f, v)}
              />

              <Separator />

              {/* Summary & Submit */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registration Summary</p>
                <div className="grid gap-1 sm:grid-cols-3 text-sm">
                  <div><span className="text-muted-foreground">Domain: </span><span className="font-mono font-semibold">{domain}</span></div>
                  <div><span className="text-muted-foreground">Period: </span><strong>{formData.years} yr</strong></div>
                  <div><span className="text-muted-foreground">Registrar: </span><strong className="capitalize">{registrar}</strong></div>
                </div>
              </div>

              <Button onClick={handleRegister} disabled={registering} size="lg" className="w-full">
                {registering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                {registering ? 'Registering…' : `Register ${domain}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
