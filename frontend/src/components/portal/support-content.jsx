'use client'

import Link from 'next/link'
import { Plus, Eye, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from './status-badge'
import { tickets } from '@/lib/data'

export function SupportContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and track support requests.</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs shrink-0">
          <Plus className="h-3.5 w-3.5" />
          New Ticket
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Your Tickets</CardTitle>
          <CardDescription className="text-xs">{tickets.length} total ticket{tickets.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Priority</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Reply</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((tkt) => (
                  <TableRow key={tkt.id}>
                    <TableCell className="font-mono text-xs font-medium">{tkt.id}</TableCell>
                    <TableCell>
                      <div className="max-w-64">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{tkt.subject}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{tkt.department}</TableCell>
                    <TableCell><StatusBadge status={tkt.status} /></TableCell>
                    <TableCell className="hidden sm:table-cell"><StatusBadge status={tkt.priority} /></TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {tkt.lastReply}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild className="h-7 px-2.5 text-xs gap-1.5">
                        <Link href={`/support/${tkt.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">View</span>
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
