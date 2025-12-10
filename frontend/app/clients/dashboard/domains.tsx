"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { DataTable, StatusBadge } from "@/components/data-table"
import { Plus, Search, Globe } from "lucide-react"

interface Domain {
  id: string
  domain: string
  status: string
  expiry: string
  autoRenew: boolean
}

const domains: Domain[] = [
  {
    id: "1",
    domain: "example.com",
    status: "Active",
    expiry: "Dec 15, 2026",
    autoRenew: true,
  },
  {
    id: "2",
    domain: "mywebsite.io",
    status: "Active",
    expiry: "Mar 20, 2026",
    autoRenew: true,
  },
  {
    id: "3",
    domain: "company-site.net",
    status: "Expired",
    expiry: "Nov 30, 2025",
    autoRenew: false,
  },
  {
    id: "4",
    domain: "blog.dev",
    status: "Active",
    expiry: "Jan 10, 2027",
    autoRenew: true,
  },
  {
    id: "5",
    domain: "store.shop",
    status: "Pending",
    expiry: "Feb 28, 2026",
    autoRenew: false,
  },
]

export default function DomainsPage() {
  const [search, setSearch] = useState("")
  const [domainList, setDomainList] = useState(domains)

  const toggleAutoRenew = (id: string) => {
    setDomainList((prev) =>
      prev.map((domain) => (domain.id === id ? { ...domain, autoRenew: !domain.autoRenew } : domain)),
    )
  }

  const columns = [
    {
      key: "domain",
      header: "Domain",
      cell: (domain: Domain) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium font-mono">{domain.domain}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (domain: Domain) => <StatusBadge status={domain.status} />,
    },
    { key: "expiry", header: "Expiry Date" },
    {
      key: "autoRenew",
      header: "Auto-Renew",
      cell: (domain: Domain) => (
        <Switch
          checked={domain.autoRenew}
          onCheckedChange={() => toggleAutoRenew(domain.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (domain: Domain) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/domains/${domain.id}`}>Manage</Link>
        </Button>
      ),
      className: "text-right",
    },
  ]

  const filteredDomains = domainList.filter((domain) => domain.domain.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Domains</h1>
          <p className="text-muted-foreground mt-1">Manage your domain names</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/domains/transfer">Transfer Domain</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/domains/register">
              <Plus className="w-4 h-4 mr-2" />
              Register Domain
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>My Domains</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredDomains} />
        </CardContent>
      </Card>
    </div>
  )
}
