'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeft,
  Server,
  Wifi,
  HardDrive,
  MapPin,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  Activity,
  Cpu,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function UsageBar({ label, value, total, color = 'bg-primary' }) {
  const alert = value > 80
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value}% <span className="text-muted-foreground font-normal">of {total}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all bg-foreground/80`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ServiceDetailContent({ service }) {
  const [restarting, setRestarting] = useState(false)

  const handleRestart = () => {
    setRestarting(true)
    setTimeout(() => setRestarting(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 mt-0.5 shrink-0">
            <Link href="/services"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
              <StatusBadge status={service.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{service.domain} &mdash; {service.plan}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={restarting || service.status === 'Suspended'}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${restarting ? 'animate-spin' : ''}`} />
            {restarting ? 'Restarting...' : 'Restart'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={service.status === 'Suspended'}>
                <RotateCcw className="h-4 w-4" />
                Reinstall
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reinstall Server</AlertDialogTitle>
                <AlertDialogDescription>
                  This will wipe all data on <strong>{service.domain}</strong> and reinstall the server. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reinstall
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {service.cpanel && (
            <Button size="sm" asChild className="gap-2">
              <a href={service.cpanel} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open Control Panel
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Activity, label: 'Uptime', value: service.uptime, color: 'text-foreground', bg: 'bg-muted' },
          { icon: MapPin, label: 'Server Location', value: service.serverLocation, color: 'text-foreground', bg: 'bg-muted' },
          { icon: Wifi, label: 'IP Address', value: service.ipAddress, color: 'text-foreground', bg: 'bg-muted' },
          { icon: Server, label: 'Renewal Date', value: service.renewalDate, color: 'text-foreground', bg: 'bg-muted' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold mt-0.5">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              Service Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Service ID', value: service.id },
              { label: 'Service Name', value: service.name },
              { label: 'Hosting Plan', value: service.plan },
              { label: 'Primary Domain', value: service.domain },
              { label: 'IP Address', value: service.ipAddress },
              { label: 'Server Location', value: service.serverLocation },
              { label: 'Monthly Price', value: service.price },
              { label: 'Renewal Date', value: service.renewalDate },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              Resource Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <UsageBar
              label="Disk Usage"
              value={service.diskUsage}
              total={service.diskTotal}
              color="bg-primary"
            />
            <UsageBar
              label="Bandwidth"
              value={service.bandwidthUsage}
              total={service.bandwidthTotal}
              color="bg-foreground/50"
            />

            {service.status === 'Suspended' && (
              <div className="rounded-lg border border-border bg-muted p-4">
                <p className="text-sm font-medium">Service Suspended</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This service has been suspended. Please contact support or pay any outstanding invoices to restore access.
                </p>
                <Button variant="outline" size="sm" asChild className="mt-3 h-7 text-xs">
                  <Link href="/support">Contact Support</Link>
                </Button>
              </div>
            )}

            {service.diskUsage > 80 && (
              <div className="rounded-lg border border-border bg-muted p-4">
                <p className="text-sm font-medium">Disk Usage Warning</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your disk is {service.diskUsage}% full. Consider upgrading your plan or freeing up space.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
