// src/app/(admin)/admin/domains/register/page.js
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'

import {
  checkDomainAvailability,
  registerDomain,
} from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'

export default function RegisterDomainPage() {
  const router = useRouter()

  const [domain, setDomain] = useState('')
  const [registrar, setRegistrar] = useState('mock')
  const [checking, setChecking] = useState(false)
  const [availability, setAvailability] = useState(null)

  const [formData, setFormData] = useState({
    years: '1',
    currency: 'USD',
    ownerId: '',
    nameservers: [],
    contacts: {
      registrant: { name: '', email: '', phone: '', country: 'US' },
      admin: { name: '', email: '', phone: '', country: 'US' },
    },
  })

  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  /* ============================================
     Check Availability
  ============================================ */
  const handleCheckAvailability = async () => {
    try {
      if (!domain || !domain.includes('.')) {
        alert('Please enter a valid domain')
        return
      }

      setChecking(true)
      setError(null)
      setAvailability(null)

      const res = await checkDomainAvailability(domain, registrar)
      setAvailability(res?.data || null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setChecking(false)
    }
  }

  /* ============================================
     Register Domain
  ============================================ */
  const handleRegister = async () => {
    try {
      if (!availability?.available) {
        alert('Domain is not available')
        return
      }

      if (!formData.ownerId) {
        alert('Please enter owner ID')
        return
      }

      if (
        !formData.contacts.registrant.name ||
        !formData.contacts.registrant.email ||
        !formData.contacts.admin.name ||
        !formData.contacts.admin.email
      ) {
        alert('Please fill in all required contact fields')
        return
      }

      setRegistering(true)
      setError(null)

      await registerDomain({
        domain,
        registrar,
        ownerId: formData.ownerId,
        years: parseInt(formData.years),
        currency: formData.currency,
        nameservers: formData.nameservers.filter(ns => ns.trim()),
        contacts: [
          { ...formData.contacts.registrant, type: 'registrant' },
          { ...formData.contacts.admin, type: 'admin' },
        ],
      })

      setSuccess(`Domain ${domain} registered successfully!`)
      setTimeout(() => {
        router.push('/admin/domains')
      }, 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setRegistering(false)
    }
  }

  /* ============================================
     Update Contact
  ============================================ */
  const updateContact = (type, field, value) => {
    setFormData({
      ...formData,
      contacts: {
        ...formData.contacts,
        [type]: {
          ...formData.contacts[type],
          [field]: value,
        },
      },
    })
  }

  /* ============================================
     Update Nameserver
  ============================================ */
  const updateNameserver = (index, value) => {
    const ns = [...formData.nameservers]
    ns[index] = value
    setFormData({ ...formData, nameservers: ns })
  }

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
      <div>
        <h1 className="text-3xl font-bold">Register Domain</h1>
        <p className="text-muted-foreground">
          Register a new domain in the system
        </p>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">{success}</p>
              <p className="text-sm text-green-800">Redirecting to domains list...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability Check */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1: Check Availability</CardTitle>
          <CardDescription>
            Enter the domain you want to register
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="domain" className="text-sm">Domain Name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={e => setDomain(e.target.value.toLowerCase())}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="registrar" className="text-sm">Registrar</Label>
              <select
                id="registrar"
                value={registrar}
                onChange={e => setRegistrar(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="mock">Mock (Testing)</option>
                <option value="porkbun">Porkbun</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCheckAvailability}
                disabled={checking}
                className="w-full"
              >
                {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Check Availability
              </Button>
            </div>
          </div>

          {/* Availability Result */}
          {availability && (
            <div className={`p-4 rounded-lg border-2 ${
              availability.available
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex gap-3">
                {availability.available ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">
                    {availability.available ? 'Available!' : 'Not Available'}
                  </p>
                  {availability.premium && (
                    <Badge variant="outline" className="mt-2">
                      Premium Domain
                    </Badge>
                  )}
                  {availability.price && (
                    <p className="text-sm mt-2">
                      Price: <span className="font-semibold">
                        ${availability.price}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Form */}
      {availability?.available && (
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="nameservers">Nameservers</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 2: Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="ownerId" className="text-sm">Owner ID</Label>
                    <Input
                      id="ownerId"
                      placeholder="user-123"
                      value={formData.ownerId}
                      onChange={e =>
                        setFormData({ ...formData, ownerId: e.target.value })
                      }
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      User ID who owns this domain
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="years" className="text-sm">Registration Years</Label>
                    <select
                      id="years"
                      value={formData.years}
                      onChange={e =>
                        setFormData({ ...formData, years: e.target.value })
                      }
                      className="mt-1.5 w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => (
                        <option key={y} value={y}>{y} year{y !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="currency" className="text-sm">Currency</Label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={e =>
                        setFormData({ ...formData, currency: e.target.value })
                      }
                      className="mt-1.5 w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nameservers Tab */}
          <TabsContent value="nameservers">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nameservers (Optional)</CardTitle>
                <CardDescription>
                  Leave blank to use default nameservers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <Label htmlFor={`ns-${i}`} className="text-sm">
                      Nameserver {i + 1}
                    </Label>
                    <Input
                      id={`ns-${i}`}
                      placeholder={i === 0 ? 'ns1.example.com' : 'ns2.example.com'}
                      value={formData.nameservers[i] || ''}
                      onChange={e => updateNameserver(i, e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <div className="space-y-4">
              {/* Registrant Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Registrant Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="reg-name" className="text-sm">Name *</Label>
                      <Input
                        id="reg-name"
                        value={formData.contacts.registrant.name}
                        onChange={e =>
                          updateContact('registrant', 'name', e.target.value)
                        }
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reg-email" className="text-sm">Email *</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={formData.contacts.registrant.email}
                        onChange={e =>
                          updateContact('registrant', 'email', e.target.value)
                        }
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reg-phone" className="text-sm">Phone</Label>
                      <Input
                        id="reg-phone"
                        value={formData.contacts.registrant.phone}
                        onChange={e =>
                          updateContact('registrant', 'phone', e.target.value)
                        }
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reg-country" className="text-sm">Country</Label>
                      <Input
                        id="reg-country"
                        value={formData.contacts.registrant.country}
                        onChange={e =>
                          updateContact('registrant', 'country', e.target.value)
                        }
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Admin Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="admin-name" className="text-sm">Name *</Label>
                      <Input
                        id="admin-name"
                        value={formData.contacts.admin.name}
                        onChange={e =>
                          updateContact('admin', 'name', e.target.value)
                        }
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="admin-email" className="text-sm">Email *</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={formData.contacts.admin.email}
                        onChange={e =>
                          updateContact('admin', 'email', e.target.value)
                        }
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="admin-phone" className="text-sm">Phone</Label>
                      <Input
                        id="admin-phone"
                        value={formData.contacts.admin.phone}
                        onChange={e =>
                          updateContact('admin', 'phone', e.target.value)
                        }
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="admin-country" className="text-sm">Country</Label>
                      <Input
                        id="admin-country"
                        value={formData.contacts.admin.country}
                        onChange={e =>
                          updateContact('admin', 'country', e.target.value)
                        }
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Register Button */}
              <Button
                onClick={handleRegister}
                disabled={registering}
                size="lg"
                className="w-full"
              >
                {registering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {registering ? 'Registering...' : 'Register Domain'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}