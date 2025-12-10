"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, StatusBadge } from "@/components/data-table"
import { CreditCard, Wallet, Download, Search, Plus } from "lucide-react"

interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  amount: string
  status: string
}

const invoices: Invoice[] = [
  {
    id: "1",
    number: "INV-2025-001",
    date: "Dec 1, 2025",
    dueDate: "Dec 15, 2025",
    amount: "$49.99",
    status: "Paid",
  },
  {
    id: "2",
    number: "INV-2025-002",
    date: "Dec 5, 2025",
    dueDate: "Dec 19, 2025",
    amount: "$29.99",
    status: "Unpaid",
  },
  {
    id: "3",
    number: "INV-2024-156",
    date: "Nov 1, 2025",
    dueDate: "Nov 15, 2025",
    amount: "$99.99",
    status: "Paid",
  },
  {
    id: "4",
    number: "INV-2024-155",
    date: "Oct 1, 2025",
    dueDate: "Oct 15, 2025",
    amount: "$49.99",
    status: "Paid",
  },
]

const columns = [
  { key: "number", header: "Invoice #" },
  { key: "date", header: "Date" },
  { key: "dueDate", header: "Due Date" },
  { key: "amount", header: "Amount" },
  {
    key: "status",
    header: "Status",
    cell: (invoice: Invoice) => <StatusBadge status={invoice.status} />,
  },
  {
    key: "actions",
    header: "",
    cell: (invoice: Invoice) => (
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="icon">
          <Download className="h-4 w-4" />
        </Button>
        {invoice.status === "Unpaid" && <Button size="sm">Pay Now</Button>}
      </div>
    ),
    className: "text-right",
  },
]

export default function BillingPage() {
  const [search, setSearch] = useState("")

  const filteredInvoices = invoices.filter((invoice) => invoice.number.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage invoices and payment methods</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/billing/add-funds">
            <Plus className="w-4 h-4 mr-2" />
            Add Funds
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Balance</p>
                <p className="text-2xl font-bold text-foreground">$250.00</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/10">
                <CreditCard className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold text-foreground">$29.99</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>View and manage your invoices</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredInvoices} />
        </CardContent>
      </Card>
    </div>
  )
}
