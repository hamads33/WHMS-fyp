'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CreditCard, Eye, User, CheckCircle, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from './status-badge'
import { ClientBillingAPI } from '@/lib/api/billing'

// ── Billing Profile Tab ───────────────────────────────────────────────────────

function BillingProfileTab() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState(null) // 'ok' | 'error' | null
  const [saveError, setSaveError] = useState(null)

  // local form state
  const [form, setForm] = useState({
    currency: '', billingAddress: '', city: '', country: '', postalCode: '', taxId: '',
  })

  useEffect(() => {
    ClientBillingAPI.getProfile()
      .then((data) => {
        const p = data?.profile ?? data ?? {}
        setProfile(p)
        setForm({
          currency:       p.currency ?? 'USD',
          billingAddress: p.billingAddress ?? '',
          city:           p.city ?? '',
          country:        p.country ?? '',
          postalCode:     p.postalCode ?? '',
          taxId:          p.taxId ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveState(null)
    setSaveError(null)
    try {
      await ClientBillingAPI.updateProfile(form)
      setSaveState('ok')
      setTimeout(() => setSaveState(null), 2500)
    } catch (e) {
      setSaveState('error')
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function field(key, label, placeholder = '') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
        <Input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 bg-muted rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Billing Profile
        </CardTitle>
        <CardDescription className="text-xs">
          Your billing address and tax information. Used on invoices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('currency',       'Currency',        'USD')}
          {field('taxId',          'Tax / VAT ID',    'Optional')}
          {field('billingAddress', 'Billing Address', '123 Main St', )}
          {field('city',           'City',            'London')}
          {field('postalCode',     'Postal Code',     'SW1A 1AA')}
          {field('country',        'Country',         'GB')}
        </div>

        {saveState === 'error' && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{saveError}</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button size="sm" className="gap-2 min-w-28" onClick={handleSave} disabled={saving}>
            {saveState === 'ok' ? (
              <><CheckCircle className="h-4 w-4" /> Saved!</>
            ) : saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BillingContent() {
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    ClientBillingAPI.listInvoices()
      .then((data) => {
        const list = data?.invoices ?? data ?? []
        setInvoices(Array.isArray(list) ? list : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingInvoices(false))

    ClientBillingAPI.listPayments()
      .then((data) => {
        const list = data?.payments ?? data ?? []
        setPayments(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => setLoadingPayments(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage invoices, payment methods and transaction history.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">Error: {error}</p>
        </div>
      )}

      <Tabs defaultValue="invoices">
        <TabsList className="h-9">
          <TabsTrigger value="invoices"     className="text-xs sm:text-sm">Invoices</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
          <TabsTrigger value="profile"      className="text-xs sm:text-sm">Billing Profile</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Invoices</CardTitle>
              <CardDescription className="text-xs">Your billing history and outstanding invoices.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingInvoices ? (
                      [...Array(4)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(6)].map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                          No invoices found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv) => {
                        const invId = inv.id
                        const invNumber = inv.invoiceNumber ?? invId
                        const issuedDate = inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : (inv.date ?? '')
                        const dueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : (inv.dueDateStr ?? '')
                        const amount = inv.totalAmount != null
                          ? `${inv.currency ?? ''}${Number(inv.totalAmount).toFixed(2)}`
                          : (inv.amount ?? '')
                        const isPending = inv.status?.toLowerCase() === 'unpaid' || inv.status?.toLowerCase() === 'overdue'
                        return (
                          <TableRow key={invId}>
                            <TableCell className="font-mono text-xs font-medium">{invNumber}</TableCell>
                            <TableCell className="text-sm">{issuedDate}</TableCell>
                            <TableCell className="text-sm hidden sm:table-cell">{dueDate}</TableCell>
                            <TableCell className="text-sm font-semibold tabular-nums">{amount}</TableCell>
                            <TableCell><StatusBadge status={inv.status} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs gap-1">
                                  <Link href={`/client/billing/${invId}`}>
                                    <Eye className="h-3 w-3" />
                                    <span className="hidden sm:inline">View</span>
                                  </Link>
                                </Button>
                                {isPending && (
                                  <Button size="sm" className="h-7 px-2.5 text-xs" asChild>
                                    <Link href={`/client/billing/${invId}`}>Pay Now</Link>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Transaction History</CardTitle>
              <CardDescription className="text-xs">All payments on your account.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden md:table-cell">Gateway</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPayments ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(5)].map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((txn) => {
                        const txnDate = txn.paidAt ? new Date(txn.paidAt).toLocaleDateString() : (txn.date ?? '')
                        const amount = txn.amount != null
                          ? `${txn.currency ?? ''}${Number(txn.amount).toFixed(2)}`
                          : (txn.formattedAmount ?? '')
                        return (
                          <TableRow key={txn.id}>
                            <TableCell className="font-mono text-xs font-medium">{txn.gatewayRef ?? txn.id}</TableCell>
                            <TableCell className="text-sm">{txnDate}</TableCell>
                            <TableCell className="text-sm hidden md:table-cell capitalize">{txn.gateway ?? '—'}</TableCell>
                            <TableCell className="text-sm font-semibold tabular-nums">{amount}</TableCell>
                            <TableCell><StatusBadge status={txn.status} /></TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Profile Tab */}
        <TabsContent value="profile" className="mt-4">
          <BillingProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
