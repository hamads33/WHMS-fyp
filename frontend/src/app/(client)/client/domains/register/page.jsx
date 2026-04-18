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
  Globe, Search, User, Server, ChevronRight,
} from 'lucide-react'

import { checkDomainAvailability, registerDomain } from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'
import { useAuth } from '@/lib/context/AuthContext'

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

function ContactFields({ label, data, onChange }) {
  const fields = [
    { key: 'name',    label: 'Full Name *',  type: 'text',  placeholder: 'John Doe' },
    { key: 'email',   label: 'Email *',      type: 'email', placeholder: 'john@example.com' },
    { key: 'phone',   label: 'Phone',        type: 'tel',   placeholder: '+1 555 000 0000' },
    { key: 'country', label: 'Country Code', type: 'text',  placeholder: 'US' },
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

export default function ClientRegisterDomainPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [domain,       setDomain]       = useState('')
  const [checking,     setChecking]     = useState(false)
  const [availability, setAvailability] = useState(null)
  const [activeStep,   setActiveStep]   = useState(0)

  const [formData, setFormData] = useState({
    years: '1',
    nameservers: ['', ''],
    contact: { name: '', email: user?.email ?? '', phone: '', country: 'US' },
  })

  const [registering, setRegistering] = useState(false)
  const [error,       setError]       = useState(null)
  const [success,     setSuccess]     = useState(null)
  const [mockWarning, setMockWarning] = useState(null)

  const STEPS = ['Check Availability', 'Nameservers', 'Contacts & Register']

  const handleCheck = async () => {
    if (!domain || !domain.includes('.')) { setError('Enter a valid domain (e.g. example.com)'); return }
    try {
      setChecking(true); setError(null); setAvailability(null); setMockWarning(null)
      const res = await checkDomainAvailability(domain, 'mock')
      setAvailability(res?.data ?? null)
      if (res?.data?.isMock || res?.data?.warning) {
        setMockWarning(res.data.warning ?? 'Demo mode — availability is simulated.')
      }
      if (res?.data?.available) setActiveStep(1)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setChecking(false) }
  }

  const handleRegister = async () => {
    const { contact } = formData
    if (!availability?.available) { setError('Domain is not available'); return }
    if (!contact.name || !contact.email) { setError('Name and email are required'); return }

    try {
      setRegistering(true); setError(null); setMockWarning(null)
      const result = await registerDomain({
        domain,
        registrar: 'mock',
        ownerId: user?.id,
        years: parseInt(formData.years),
        currency: 'USD',
        nameservers: formData.nameservers.filter(ns => ns.trim()),
        contacts: [
          { ...contact, type: 'registrant' },
          { ...contact, type: 'admin' },
        ],
      })
      if (result?.isMock || result?.warning) {
        setMockWarning(result.warning ?? 'Domain registered in demo mode — this is not a real domain.')
      }
      setSuccess(`${domain} registered successfully!`)
      setTimeout(() => router.push('/client/domains'), 2000)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setRegistering(false) }
  }

  const updateContact = (field, value) =>
    setFormData(f => ({ ...f, contact: { ...f.contact, [field]: value } }))

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/client/domains">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My Domains
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Register a Domain</h1>
        <p className="text-sm text-muted-foreground mt-1">Check availability and register your domain in a few steps.</p>
      </div>

      <StepIndicator steps={STEPS} current={activeStep} />

      {error && (
        <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 bg-accent/10 border border-accent/30 text-accent rounded-lg p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" /><span>{success} Redirecting…</span>
        </div>
      )}

      {/* Step 0 — Availability */}
      <Card className={activeStep > 0 && availability?.available ? 'border-accent/30 bg-accent/5' : ''}>
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="example.com"
                value={domain}
                onChange={e => { setDomain(e.target.value.toLowerCase()); setAvailability(null) }}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button onClick={handleCheck} disabled={checking} className="h-9 px-4">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">{checking ? 'Checking…' : 'Check'}</span>
            </Button>
          </div>

          {availability && (
            <>
              <div className={`rounded-lg border-2 p-4 flex items-start gap-3 ${
                availability.available
                  ? 'border-accent/30 bg-accent/5'
                  : 'border-destructive/30 bg-destructive/10'
              }`}>
                {availability.available
                  ? <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-semibold text-sm ${availability.available ? 'text-accent' : 'text-destructive'}`}>
                    {availability.available ? `${domain} is available!` : `${domain} is not available`}
                  </p>
                  {availability.price && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Registration price: <strong className="text-foreground">${availability.price}</strong>
                    </p>
                  )}
                </div>
              </div>

              {mockWarning && (
                <div className="flex items-start gap-2.5 rounded-lg border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{mockWarning}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {availability?.available && (
        <div className="space-y-4">
          {/* Step 1 — Registration period */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" /> Step 2 — Nameservers
                <Badge variant="outline" className="text-xs ml-1">Optional</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Leave blank to use default nameservers. You can also set your registration period below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs mb-1.5 block">Registration Period</Label>
                <select
                  value={formData.years}
                  onChange={e => setFormData(f => ({ ...f, years: e.target.value }))}
                  className="w-40 h-9 px-3 border border-input rounded-md bg-background text-sm"
                >
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} year{y !== 1 ? 's' : ''}</option>)}
                </select>
              </div>
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

          {/* Step 2 — Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" /> Step 3 — Contact Information
              </CardTitle>
              <CardDescription className="text-xs">Used for both registrant and admin (required by ICANN)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">Full Name *</Label>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={formData.contact.name}
                      onChange={e => updateContact('name', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Email *</Label>
                    <Input
                      type="email"
                      placeholder={user?.email ?? 'john@example.com'}
                      value={formData.contact.email}
                      onChange={e => updateContact('email', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Phone</Label>
                    <Input
                      type="tel"
                      placeholder="+1 555 000 0000"
                      value={formData.contact.phone}
                      onChange={e => updateContact('phone', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Country Code *</Label>
                    <Input
                      type="text"
                      placeholder="US"
                      value={formData.contact.country}
                      onChange={e => updateContact('country', e.target.value.toUpperCase())}
                      className="h-9 text-sm"
                      maxLength="2"
                    />
                  </div>
                </div>
              </div>
              <Separator />

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
                <div className="grid gap-1 sm:grid-cols-3 text-sm">
                  <div><span className="text-muted-foreground">Domain: </span><span className="font-mono font-semibold">{domain}</span></div>
                  <div><span className="text-muted-foreground">Period: </span><strong>{formData.years} yr</strong></div>
                  <div><span className="text-muted-foreground">Currency: </span><strong>USD</strong></div>
                </div>
              </div>

              {mockWarning && (
                <div className="flex items-start gap-2.5 rounded-lg border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{mockWarning}</span>
                </div>
              )}

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
