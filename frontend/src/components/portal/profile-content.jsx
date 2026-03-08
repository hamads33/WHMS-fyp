'use client'

import { useState } from 'react'
import { User, Lock, CreditCard, Shield, Eye, EyeOff, CheckCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { currentUser, paymentMethods } from '@/lib/data'

function FormField({ label, id, defaultValue, type = 'text', className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <Input id={id} type={type} defaultValue={defaultValue} className="h-9 text-sm" />
    </div>
  )
}

export function ProfileContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [saved, setSaved] = useState(false)

  const initials = currentUser.name.split(' ').map((n) => n[0]).join('')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information and security settings.</p>
      </div>

      {/* Client Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Personal Information
          </CardTitle>
          <CardDescription className="text-xs">Update your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-semibold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs">Change Avatar</Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First Name" id="first-name" defaultValue="Alex" />
            <FormField label="Last Name" id="last-name" defaultValue="Johnson" />
            <FormField label="Email Address" id="email" type="email" defaultValue={currentUser.email} className="sm:col-span-2" />
            <FormField label="Company" id="company" defaultValue={currentUser.company} className="sm:col-span-2" />
            <FormField label="Phone Number" id="phone" type="tel" defaultValue={currentUser.phone} />
            <FormField label="Address" id="address" defaultValue={currentUser.address} />
            <FormField label="City" id="city" defaultValue={currentUser.city} />
            <FormField label="State / Province" id="state" defaultValue={currentUser.state} />
            <FormField label="ZIP / Postal Code" id="zip" defaultValue={currentUser.zip} />
            <FormField label="Country" id="country" defaultValue={currentUser.country} />
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={handleSave} size="sm" className="gap-2 min-w-28">
              {saved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Security
          </CardTitle>
          <CardDescription className="text-xs">Manage your password and two-factor authentication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Change password */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Change Password</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="current-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    className="h-9 text-sm pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  New Password
                </Label>
                <Input id="new-password" type="password" placeholder="New password" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Confirm Password
                </Label>
                <Input id="confirm-password" type="password" placeholder="Confirm password" className="h-9 text-sm" />
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs mt-1">Update Password</Button>
          </div>

          <Separator />

          {/* 2FA */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add an extra layer of security with 2FA via authenticator app.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {twoFactor && (
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  Enabled
                </Badge>
              )}
              <Switch
                checked={twoFactor}
                onCheckedChange={setTwoFactor}
                aria-label="Toggle two-factor authentication"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing / Saved Payment Methods */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Saved Payment Methods
          </CardTitle>
          <CardDescription className="text-xs">Manage your saved cards and payment accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  {method.type === 'PayPal' ? (
                    <>
                      <p className="text-sm font-medium">PayPal</p>
                      <p className="text-xs text-muted-foreground">{method.email}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{method.type} ending in {method.last4}</p>
                      <p className="text-xs text-muted-foreground">Expires {method.expiry}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {method.isDefault && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 hidden sm:flex">Default</Badge>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="h-8 text-xs w-full mt-2">
            + Add New Payment Method
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
