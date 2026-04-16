'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Shield, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/context/AuthContext'
import { ClientProfileAPI } from '@/lib/api/profile'

function FormField({ label, id, value, onChange, type = 'text', disabled = false, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-9 text-sm"
      />
    </div>
  )
}

export function ProfileContent() {
  const { user, loadSession } = useAuth()

  // Profile data state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postal: '',
  })

  // Password data state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // UI state
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [twoFactor, setTwoFactor] = useState(user?.mfaEnabled ?? false)

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        setProfileError(null)
        const data = await ClientProfileAPI.get()
        setProfileData(data)
      } catch (err) {
        console.error('Failed to load profile:', err)
        setProfileError(err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      loadProfile()
    }
  }, [user?.id])

  const handleProfileChange = (field) => (e) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
    setProfileSuccess(false)
  }

  const handlePasswordChange = (field) => (e) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
    setPasswordError(null)
  }

  const handleSaveProfile = async () => {
    try {
      // Validate required fields
      if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
        setProfileError('First name and last name are required')
        return
      }

      setProfileSaving(true)
      setProfileError(null)
      setProfileSuccess(false)

      await ClientProfileAPI.update({
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        company: profileData.company.trim() || null,
        phone: profileData.phone.trim() || null,
        address: profileData.address.trim() || null,
        city: profileData.city.trim() || null,
        country: profileData.country.trim() || null,
        postal: profileData.postal.trim() || null,
      })

      setProfileSuccess(true)

      // Refresh session so nav avatar updates
      await loadSession()

      // Clear success message after 2 seconds
      setTimeout(() => setProfileSuccess(false), 2000)
    } catch (err) {
      console.error('Failed to save profile:', err)
      setProfileError(err.message || 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      setPasswordError(null)
      setPasswordSuccess(false)

      // Validate
      if (!passwordData.currentPassword) {
        setPasswordError('Current password is required')
        return
      }

      if (!passwordData.newPassword) {
        setPasswordError('New password is required')
        return
      }

      if (passwordData.newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long')
        return
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('Passwords do not match')
        return
      }

      if (passwordData.currentPassword === passwordData.newPassword) {
        setPasswordError('New password must be different from current password')
        return
      }

      setPasswordChanging(true)

      await ClientProfileAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      setPasswordSuccess(true)

      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to change password:', err)
      setPasswordError(err.message || 'Failed to change password')
    } finally {
      setPasswordChanging(false)
    }
  }

  const displayName = `${profileData.firstName} ${profileData.lastName}`.trim() || user?.email || ''
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading your profile...</p>
        </div>
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information and security settings.</p>
      </div>

      {/* Profile Error Banner */}
      {profileError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{profileError}</AlertDescription>
        </Alert>
      )}

      {/* Personal Information */}
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
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? ''}</p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" disabled>
                Change Avatar
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="First Name"
              id="first-name"
              value={profileData.firstName}
              onChange={handleProfileChange('firstName')}
            />
            <FormField
              label="Last Name"
              id="last-name"
              value={profileData.lastName}
              onChange={handleProfileChange('lastName')}
            />
            <FormField
              label="Email Address"
              id="email"
              type="email"
              value={profileData.email}
              disabled
              className="sm:col-span-2"
            />
            <FormField
              label="Company"
              id="company"
              value={profileData.company}
              onChange={handleProfileChange('company')}
              className="sm:col-span-2"
            />
            <FormField
              label="Phone Number"
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={handleProfileChange('phone')}
            />
            <FormField
              label="Address"
              id="address"
              value={profileData.address}
              onChange={handleProfileChange('address')}
            />
            <FormField
              label="City"
              id="city"
              value={profileData.city}
              onChange={handleProfileChange('city')}
            />
            <FormField
              label="ZIP / Postal Code"
              id="zip"
              value={profileData.postal}
              onChange={handleProfileChange('postal')}
            />
            <FormField
              label="Country"
              id="country"
              value={profileData.country}
              onChange={handleProfileChange('country')}
              className="sm:col-span-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            {profileSuccess && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Saved!
              </span>
            )}
            <Button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              size="sm"
              className="gap-2 min-w-28"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
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
          {/* Password Error Alert */}
          {passwordError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}

          {/* Password Success Alert */}
          {passwordSuccess && (
            <Alert className="border-green-600 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Password changed successfully
              </AlertDescription>
            </Alert>
          )}

          {/* Change password */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Change Password</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="current-password"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange('currentPassword')}
                    className="h-9 text-sm pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="new-password"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="New password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange('newPassword')}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="confirm-password"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange('confirmPassword')}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs mt-1"
              onClick={handleChangePassword}
              disabled={passwordChanging}
            >
              {passwordChanging ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
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
                disabled
                aria-label="Toggle two-factor authentication"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
