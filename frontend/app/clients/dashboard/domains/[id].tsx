"use client"

import { use, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Globe, Copy, Plus, Trash2, Eye, EyeOff, Server } from "lucide-react"

const domainData = {
  id: "1",
  domain: "example.com",
  status: "Active",
  expiry: "Dec 15, 2026",
  registrar: "WHMS Registrar",
  created: "Dec 15, 2021",
  autoRenew: true,
  privacyProtection: true,
  eppCode: "X7K9-PLM2-QRS4",
}

const dnsRecords = [
  { id: "1", type: "A", name: "@", value: "192.168.1.100", ttl: "3600" },
  { id: "2", type: "A", name: "www", value: "192.168.1.100", ttl: "3600" },
  { id: "3", type: "CNAME", name: "blog", value: "example.com", ttl: "3600" },
  { id: "4", type: "MX", name: "@", value: "mail.example.com", ttl: "3600" },
  { id: "5", type: "TXT", name: "@", value: "v=spf1 include:_spf.google.com ~all", ttl: "3600" },
]

const nameservers = ["ns1.whms.io", "ns2.whms.io"]

const contacts = {
  registrant: {
    name: "John Doe",
    organization: "Example Inc.",
    email: "john@example.com",
    phone: "+1.5551234567",
    address: "123 Main St, New York, NY 10001, US",
  },
}

export default function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [showEppCode, setShowEppCode] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/domains">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground font-mono">{domainData.domain}</h1>
            <Badge variant="default" className="bg-success text-success-foreground">
              {domainData.status}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dns">DNS Records</TabsTrigger>
          <TabsTrigger value="nameservers">Nameservers</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Domain Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Domain</span>
                  <span className="font-mono font-medium">{domainData.domain}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default" className="bg-success text-success-foreground">
                    {domainData.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Registrar</span>
                  <span className="font-medium">{domainData.registrar}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="font-medium">{domainData.created}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expires</span>
                  <span className="font-medium">{domainData.expiry}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Domain Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Auto-Renew</Label>
                    <p className="text-xs text-muted-foreground">Automatically renew before expiration</p>
                  </div>
                  <Switch checked={domainData.autoRenew} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Privacy Protection</Label>
                    <p className="text-xs text-muted-foreground">Hide WHOIS contact information</p>
                  </div>
                  <Switch checked={domainData.privacyProtection} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>EPP/Transfer Code</CardTitle>
              <CardDescription>Use this code to transfer your domain to another registrar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 rounded-lg bg-muted font-mono">
                  {showEppCode ? domainData.eppCode : "••••••••••••"}
                </div>
                <Button variant="outline" size="icon" onClick={() => setShowEppCode(!showEppCode)}>
                  {showEppCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(domainData.eppCode)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dns" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>DNS Records</CardTitle>
                  <CardDescription>Manage your domain&apos;s DNS records</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dnsRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Badge variant="outline">{record.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.name}</TableCell>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">{record.value}</TableCell>
                        <TableCell>{record.ttl}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nameservers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nameservers</CardTitle>
              <CardDescription>Configure your domain&apos;s nameservers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nameservers.map((ns, index) => (
                <div key={ns} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                    <Server className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input value={ns} className="font-mono" readOnly />
                </div>
              ))}
              <Button variant="outline" className="w-full bg-transparent">
                <Plus className="w-4 h-4 mr-2" />
                Add Nameserver
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registrant Contact</CardTitle>
              <CardDescription>Contact information for this domain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <p className="font-medium">{contacts.registrant.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Organization</Label>
                  <p className="font-medium">{contacts.registrant.organization}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="font-medium">{contacts.registrant.email}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Phone</Label>
                  <p className="font-medium">{contacts.registrant.phone}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm text-muted-foreground">Address</Label>
                  <p className="font-medium">{contacts.registrant.address}</p>
                </div>
              </div>
              <Button variant="outline">Edit Contact Information</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
