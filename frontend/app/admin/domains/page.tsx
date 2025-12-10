"use client"

import { useState } from "react"
import { Plus, Search, Filter, MoreHorizontal, Shield, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { domains } from "../../../lib/mock-data"

export default function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDomains = domains.filter(
    (domain) =>
      domain.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      domain.client.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const columns = [
    {
      key: "domain",
      header: "Domain",
      render: (domain: (typeof domains)[0]) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-card-foreground">{domain.domain}</span>
          {domain.ssl ? (
            <Shield className="h-4 w-4 text-success" />
          ) : (
            <ShieldOff className="h-4 w-4 text-destructive" />
          )}
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      render: (domain: (typeof domains)[0]) => <span className="text-muted-foreground">{domain.client}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (domain: (typeof domains)[0]) => <StatusBadge status={domain.status} />,
    },
    {
      key: "dns",
      header: "DNS Provider",
      render: (domain: (typeof domains)[0]) => <span className="text-card-foreground">{domain.dns}</span>,
    },
    {
      key: "expires",
      header: "Expires",
      render: (domain: (typeof domains)[0]) => <span className="text-muted-foreground">{domain.expires}</span>,
    },
    {
      key: "actions",
      header: "",
      render: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Manage DNS</DropdownMenuItem>
            <DropdownMenuItem>Renew Domain</DropdownMenuItem>
            <DropdownMenuItem>SSL Settings</DropdownMenuItem>
            <DropdownMenuItem>Transfer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Domains</h1>
          <p className="text-muted-foreground">Manage registered domains and DNS</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Domain
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="all">All Domains</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="transferred">Transferred</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search domains..."
                    className="pl-9 bg-secondary border-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={filteredDomains} columns={columns} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card className="bg-card border-border p-6">
            <p className="text-muted-foreground">Active domains will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card className="bg-card border-border p-6">
            <p className="text-muted-foreground">Expiring domains will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="transferred">
          <Card className="bg-card border-border p-6">
            <p className="text-muted-foreground">Transferred domains will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
