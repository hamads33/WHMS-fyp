'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CreditCard, Plus, Trash2, CheckCircle, Eye } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './status-badge'
import { invoices, transactions, paymentMethods } from '@/lib/data'

function PaymentMethodCard({ method, onRemove }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
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
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 hidden sm:flex">
            Default
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Remove payment method">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function BillingContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage invoices, payment methods and transaction history.</p>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="h-9">
          <TabsTrigger value="invoices" className="text-xs sm:text-sm">Invoices</TabsTrigger>
          <TabsTrigger value="payment-methods" className="text-xs sm:text-sm">Payment Methods</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
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
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-medium">{inv.id}</TableCell>
                        <TableCell className="text-sm">{inv.date}</TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{inv.dueDate}</TableCell>
                        <TableCell className="text-sm font-semibold tabular-nums">{inv.amount}</TableCell>
                        <TableCell><StatusBadge status={inv.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs gap-1">
                              <Link href={`/billing/${inv.id}`}>
                                <Eye className="h-3 w-3" />
                                <span className="hidden sm:inline">View</span>
                              </Link>
                            </Button>
                            {(inv.status === 'Unpaid' || inv.status === 'Overdue') && (
                              <Button size="sm" className="h-7 px-2.5 text-xs">
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Payment Methods</CardTitle>
                <CardDescription className="text-xs mt-0.5">Manage your saved payment methods.</CardDescription>
              </div>
              <Button size="sm" className="gap-1.5 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Method
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMethods.map((method) => (
                <PaymentMethodCard key={method.id} method={method} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Transaction History</CardTitle>
              <CardDescription className="text-xs">All payments and credits on your account.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="hidden sm:table-cell">Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="font-mono text-xs font-medium">{txn.id}</TableCell>
                        <TableCell className="text-sm">{txn.date}</TableCell>
                        <TableCell className="text-sm hidden md:table-cell text-muted-foreground">{txn.description}</TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{txn.method}</TableCell>
                        <TableCell className="text-sm font-semibold tabular-nums">{txn.amount}</TableCell>
                        <TableCell><StatusBadge status={txn.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
