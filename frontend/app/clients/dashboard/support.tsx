"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, StatusBadge } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, MessageSquare } from "lucide-react"

interface Ticket {
  id: string
  subject: string
  department: string
  priority: string
  status: string
  lastReply: string
}

const tickets: Ticket[] = [
  {
    id: "4521",
    subject: "Cannot access cPanel",
    department: "Technical Support",
    priority: "High",
    status: "Open",
    lastReply: "2 hours ago",
  },
  {
    id: "4520",
    subject: "Billing inquiry about invoice",
    department: "Billing",
    priority: "Medium",
    status: "Answered",
    lastReply: "1 day ago",
  },
  {
    id: "4518",
    subject: "Domain transfer request",
    department: "Sales",
    priority: "Low",
    status: "Closed",
    lastReply: "3 days ago",
  },
  {
    id: "4515",
    subject: "Email delivery issues",
    department: "Technical Support",
    priority: "High",
    status: "Open",
    lastReply: "5 hours ago",
  },
]

const priorityColors: Record<string, string> = {
  High: "bg-destructive text-destructive-foreground",
  Medium: "bg-warning text-warning-foreground",
  Low: "bg-muted text-muted-foreground",
}

const columns = [
  {
    key: "id",
    header: "Ticket #",
    cell: (ticket: Ticket) => <span className="font-mono text-sm">#{ticket.id}</span>,
  },
  {
    key: "subject",
    header: "Subject",
    cell: (ticket: Ticket) => (
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <span className="font-medium">{ticket.subject}</span>
      </div>
    ),
  },
  { key: "department", header: "Department" },
  {
    key: "priority",
    header: "Priority",
    cell: (ticket: Ticket) => <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    cell: (ticket: Ticket) => <StatusBadge status={ticket.status} />,
  },
  { key: "lastReply", header: "Last Reply" },
  {
    key: "actions",
    header: "",
    cell: (ticket: Ticket) => (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/support/${ticket.id}`}>View</Link>
      </Button>
    ),
    className: "text-right",
  },
]

export default function SupportPage() {
  const [search, setSearch] = useState("")

  const filteredTickets = tickets.filter(
    (ticket) => ticket.subject.toLowerCase().includes(search.toLowerCase()) || ticket.id.includes(search),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground mt-1">Manage your support tickets</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/support/new">
            <Plus className="w-4 h-4 mr-2" />
            Open Ticket
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>View and manage your support requests</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredTickets} />
        </CardContent>
      </Card>
    </div>
  )
}
