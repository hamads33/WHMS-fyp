"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, StatusBadge } from "@/components/data-table"
import { Plus, Search, Server } from "lucide-react"

interface Service {
  id: string
  name: string
  plan: string
  status: string
  billingCycle: string
  nextDue: string
}

const services: Service[] = [
  {
    id: "1",
    name: "My VPS Server",
    plan: "VPS Pro 4GB",
    status: "Active",
    billingCycle: "Monthly",
    nextDue: "Jan 15, 2026",
  },
  {
    id: "2",
    name: "Company Website",
    plan: "Shared Business",
    status: "Active",
    billingCycle: "Annual",
    nextDue: "Jun 20, 2026",
  },
  {
    id: "3",
    name: "Development Server",
    plan: "VPS Basic 2GB",
    status: "Suspended",
    billingCycle: "Monthly",
    nextDue: "Dec 1, 2025",
  },
  {
    id: "4",
    name: "E-commerce Store",
    plan: "Dedicated Server",
    status: "Active",
    billingCycle: "Monthly",
    nextDue: "Jan 5, 2026",
  },
  {
    id: "5",
    name: "Staging Environment",
    plan: "Shared Starter",
    status: "Pending",
    billingCycle: "Annual",
    nextDue: "Mar 10, 2026",
  },
]

const columns = [
  {
    key: "name",
    header: "Service Name",
    cell: (service: Service) => (
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <Server className="w-4 h-4 text-primary" />
        </div>
        <span className="font-medium">{service.name}</span>
      </div>
    ),
  },
  { key: "plan", header: "Plan" },
  {
    key: "status",
    header: "Status",
    cell: (service: Service) => <StatusBadge status={service.status} />,
  },
  { key: "billingCycle", header: "Billing Cycle" },
  { key: "nextDue", header: "Next Due" },
  {
    key: "actions",
    header: "",
    cell: (service: Service) => (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/services/${service.id}`}>Manage</Link>
      </Button>
    ),
    className: "text-right",
  },
]

export default function ServicesPage() {
  const [search, setSearch] = useState("")

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.plan.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">Manage your hosting services</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/services/order">
            <Plus className="w-4 h-4 mr-2" />
            Order New Service
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Services</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredServices} />
        </CardContent>
      </Card>
    </div>
  )
}
