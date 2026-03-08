'use client'

import Link from 'next/link'
import { Server, ArrowRight, Calendar, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import { services } from '@/lib/data'

export function ServicesContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your hosting services and subscriptions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((svc) => (
          <Card key={svc.id} className="flex flex-col hover:border-primary/40 transition-colors">
            <CardContent className="flex flex-col flex-1 p-5 gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{svc.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{svc.plan}</p>
                  </div>
                </div>
                <StatusBadge status={svc.status} />
              </div>

              {/* Details */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Domain:</span>
                  <span className="font-medium truncate">{svc.domain}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Renews:</span>
                  <span className="font-medium">{svc.renewalDate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-semibold text-primary">{svc.price}</span>
                </div>
              </div>

              {/* Usage bars */}
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Disk Usage</span>
                    <span className="font-medium">{svc.diskUsage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all bg-foreground/80`}
                      style={{ width: `${svc.diskUsage}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Bandwidth</span>
                    <span className="font-medium">{svc.bandwidthUsage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all bg-foreground/50`}
                      style={{ width: `${svc.bandwidthUsage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2">
                <Button size="sm" asChild className="flex-1">
                  <Link href={`/services/${svc.id}`}>
                    Manage
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild className="flex-1">
                  <Link href={`/services/${svc.id}`}>View</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
