'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Download, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from './status-badge'
import { useAuth } from '@/lib/context/AuthContext'
import { ClientBillingAPI } from '@/lib/api/billing'

export function InvoiceDetailContent({ invoiceId }) {
  const { user } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState(null)

  useEffect(() => {
    if (!invoiceId) return
    ClientBillingAPI.getInvoice(invoiceId)
      .then((data) => setInvoice(data.invoice ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [invoiceId])

  const handlePay = async () => {
    if (!invoice) return
    setPaying(true)
    setPayError(null)
    try {
      const result = await ClientBillingAPI.payInvoice(invoice.id, 'stripe')
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }
      throw new Error('Payment session URL was not returned by the server')
    } catch (e) {
      setPayError(e.message)
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        <div className="h-80 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/client/billing"><ArrowLeft className="h-4 w-4 mr-2" />Back to Billing</Link>
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-sm text-destructive font-medium">Error: {error || 'Invoice not found'}</p>
        </div>
      </div>
    )
  }

  const isPending = invoice.status?.toLowerCase() === 'unpaid' || invoice.status?.toLowerCase() === 'overdue'
  const invNumber = invoice.invoiceNumber ?? invoice.id
  const issuedDate = invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : (invoice.date ?? '')
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ''
  const currency = invoice.currency ?? ''
  const total = invoice.totalAmount != null ? `${currency}${Number(invoice.totalAmount).toFixed(2)}` : (invoice.total ?? '')
  const subtotal = invoice.subtotal != null ? `${currency}${Number(invoice.subtotal).toFixed(2)}` : ''
  const taxAmount = invoice.taxAmount != null ? `${currency}${Number(invoice.taxAmount).toFixed(2)}` : ''
  const lineItems = invoice.lineItems ?? invoice.items ?? []

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
          <Link href="/client/billing"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{invNumber}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Invoice details and payment</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">{invNumber}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Issued: {issuedDate}
                {dueDate && <> &nbsp;|&nbsp; Due: {dueDate}</>}
              </p>
            </div>
            <div className="text-right">
              <StatusBadge status={invoice.status} className="mb-2" />
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bill to */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Bill To</p>
            {user && (
              <>
                <p className="text-sm font-medium">{user.name ?? user.firstName ?? ''}</p>
                <p className="text-sm text-muted-foreground">{user.company ?? ''}</p>
                <p className="text-sm text-muted-foreground">{user.email ?? ''}</p>
              </>
            )}
          </div>

          <Separator />

          {/* Line items */}
          {lineItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Items</p>
              <div className="space-y-2">
                {lineItems.map((item, i) => {
                  const itemAmount = item.total != null
                    ? `${currency}${Number(item.total).toFixed(2)}`
                    : (item.amount ?? '')
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <p className="text-sm">{item.description ?? item.label ?? `Item ${i + 1}`}</p>
                      <p className="text-sm font-semibold tabular-nums">{itemAmount}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            {subtotal && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{subtotal}</span>
              </div>
            )}
            {taxAmount && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{taxAmount}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{total}</span>
            </div>
          </div>

          {payError && (
            <p className="text-sm text-destructive">{payError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isPending && (
              <Button className="flex-1 gap-2" onClick={handlePay} disabled={paying}>
                <CreditCard className="h-4 w-4" />
                {paying ? 'Processing…' : `Pay ${total} Now`}
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
                const url = `${base}/client/billing/invoices/${invoiceId}/pdf`
                fetch(url, { credentials: 'include' })
                  .then((r) => {
                    if (!r.ok) throw new Error(`PDF not available (${r.status})`)
                    return r.blob()
                  })
                  .then((blob) => {
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `invoice-${invoiceId}.pdf`
                    a.click()
                    URL.revokeObjectURL(a.href)
                  })
                  .catch((e) => alert(`Download failed: ${e.message}`))
              }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
