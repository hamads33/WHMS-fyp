'use client'

import Link from 'next/link'
import { ArrowLeft, Download, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from './status-badge'
import { currentUser } from '@/lib/data'

export function InvoiceDetailContent({ invoice }) {
  const isPending = invoice.status === 'Unpaid' || invoice.status === 'Overdue'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
          <Link href="/billing"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.id}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Invoice details and payment</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">{invoice.id}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Issued: {invoice.date} &nbsp;|&nbsp; Due: {invoice.dueDate}</p>
            </div>
            <div className="text-right">
              <StatusBadge status={invoice.status} className="mb-2" />
              <p className="text-2xl font-bold">{invoice.total}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bill to */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Bill To</p>
            <p className="text-sm font-medium">{currentUser.name}</p>
            <p className="text-sm text-muted-foreground">{currentUser.company}</p>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Items</p>
            <div className="space-y-2">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <p className="text-sm">{item.description}</p>
                  <p className="text-sm font-semibold tabular-nums">{item.amount}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{invoice.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-muted-foreground">{invoice.discount}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{invoice.total}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isPending && (
              <Button className="flex-1 gap-2">
                <CreditCard className="h-4 w-4" />
                Pay {invoice.total} Now
              </Button>
            )}
            <Button variant="outline" className="gap-2" size={isPending ? 'default' : 'default'}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
