"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Server, Cpu, HardDrive, Wifi, Globe, ExternalLink, ArrowUpRight, AlertTriangle } from "lucide-react"

const serviceData = {
  id: "1",
  name: "My VPS Server",
  plan: "VPS Pro 4GB",
  status: "Active",
  billingCycle: "Monthly",
  nextDue: "Jan 15, 2026",
  price: "$29.99/mo",
  ip: "192.168.1.100",
  hostname: "vps-pro-4gb.whms.io",
  os: "Ubuntu 22.04 LTS",
  location: "New York, US",
  specs: {
    cpu: "4 vCPU Cores",
    ram: "4 GB RAM",
    storage: "80 GB NVMe SSD",
    bandwidth: "4 TB Transfer",
  },
  features: ["Root Access", "DDoS Protection", "Weekly Backups", "24/7 Monitoring", "IPv6 Support", "SSD Storage"],
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/services">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{serviceData.name}</h1>
            <Badge variant="default" className="bg-success text-success-foreground">
              {serviceData.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{serviceData.plan}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="font-medium font-mono">{serviceData.ip}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                    <Server className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hostname</p>
                    <p className="font-medium font-mono text-sm">{serviceData.hostname}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                    <HardDrive className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Operating System</p>
                    <p className="font-medium">{serviceData.os}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                    <Wifi className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{serviceData.location}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Server Specifications</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Cpu className="w-5 h-5 text-primary" />
                    <span className="text-sm">{serviceData.specs.cpu}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Server className="w-5 h-5 text-primary" />
                    <span className="text-sm">{serviceData.specs.ram}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <HardDrive className="w-5 h-5 text-primary" />
                    <span className="text-sm">{serviceData.specs.storage}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Wifi className="w-5 h-5 text-primary" />
                    <span className="text-sm">{serviceData.specs.bandwidth}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button className="w-full sm:w-auto">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Login to Control Panel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {serviceData.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="font-medium">{serviceData.plan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="font-medium">{serviceData.price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Billing Cycle</span>
                <span className="font-medium">{serviceData.billingCycle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next Due</span>
                <span className="font-medium">{serviceData.nextDue}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upgrade Plan</CardTitle>
              <CardDescription>Get more resources for your server</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                View Upgrade Options
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Cancel Service
              </CardTitle>
              <CardDescription>Request cancellation of this service. This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
                Request Cancellation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
