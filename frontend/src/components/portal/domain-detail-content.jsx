'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Globe, Server, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from './status-badge'

export function DomainDetailContent({ domain }) {
  const [nameservers, setNameservers] = useState(domain.nameservers)
  const [editing, setEditing] = useState(false)
  const [ns1, setNs1] = useState(domain.nameservers[0] || '')
  const [ns2, setNs2] = useState(domain.nameservers[1] || '')

  const handleSaveNS = () => {
    setNameservers([ns1, ns2].filter(Boolean))
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 mt-0.5">
          <Link href="/domains"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{domain.name}</h1>
            <StatusBadge status={domain.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Registered with {domain.registrar} &mdash; Expires {domain.expiryDate}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Domain Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Domain Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Domain Name', value: domain.name },
              { label: 'Status', value: <StatusBadge status={domain.status} /> },
              { label: 'Registrar', value: domain.registrar },
              { label: 'Expiry Date', value: domain.expiryDate },
              { label: 'Auto-Renew', value: domain.autoRenew ? 'Enabled' : 'Disabled' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Nameservers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              Nameservers
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nameserver 1</label>
                  <Input value={ns1} onChange={(e) => setNs1(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nameserver 2</label>
                  <Input value={ns2} onChange={(e) => setNs2(e.target.value)} className="h-8 text-sm" />
                </div>
                <Button size="sm" onClick={handleSaveNS} className="h-7 text-xs w-full">
                  Save Nameservers
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {nameservers.map((ns, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">NS{i + 1}</span>
                    <span className="text-sm font-mono font-medium">{ns}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DNS Records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">DNS Records</CardTitle>
          <Button size="sm" className="gap-1.5 h-7 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Record
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {domain.dns.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No DNS records configured. Add a record to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="hidden sm:table-cell">TTL</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domain.dns.map((record, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{record.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.name}</TableCell>
                      <TableCell className="font-mono text-sm max-w-48 truncate">{record.value}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{record.ttl}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Delete DNS record">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
