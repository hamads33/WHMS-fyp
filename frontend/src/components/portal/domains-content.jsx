'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Globe, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from './status-badge'
import { domains as initialDomains } from '@/lib/data'

export function DomainsContent() {
  const [domainList, setDomainList] = useState(initialDomains)

  const toggleAutoRenew = (id) => {
    setDomainList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, autoRenew: !d.autoRenew } : d))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Domains</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your registered domains and DNS settings.</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs shrink-0">
          <Globe className="h-3.5 w-3.5" />
          Register Domain
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Your Domains</CardTitle>
          <CardDescription className="text-xs">{domainList.length} domain{domainList.length !== 1 ? 's' : ''} registered</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Expiry Date</TableHead>
                  <TableHead className="hidden md:table-cell">Registrar</TableHead>
                  <TableHead>Auto-Renew</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domainList.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{domain.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={domain.status} />
                    </TableCell>
                    <TableCell className="text-sm hidden sm:table-cell">{domain.expiryDate}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{domain.registrar}</TableCell>
                    <TableCell>
                      <Switch
                        checked={domain.autoRenew}
                        onCheckedChange={() => toggleAutoRenew(domain.id)}
                        aria-label={`Toggle auto-renew for ${domain.name}`}
                        disabled={domain.status === 'Expired'}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild className="h-7 px-2.5 text-xs gap-1.5">
                        <Link href={`/domains/${domain.id}`}>
                          <Settings className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Manage</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
