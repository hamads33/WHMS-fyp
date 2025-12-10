"use client"

import { MonitorSmartphone, MapPin, Clock, LogOut, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { sessions } from "../../../lib/mock-data"

export default function SessionsPage() {
  const columns = [
    {
      key: "user",
      header: "User",
      render: (session: (typeof sessions)[0]) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MonitorSmartphone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-card-foreground">{session.user}</p>
            <p className="text-sm text-muted-foreground">{session.device}</p>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (session: (typeof sessions)[0]) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{session.location}</span>
        </div>
      ),
    },
    {
      key: "ip",
      header: "IP Address",
      render: (session: (typeof sessions)[0]) => (
        <span className="font-mono text-sm text-card-foreground">{session.ip}</span>
      ),
    },
    {
      key: "started",
      header: "Started",
      render: (session: (typeof sessions)[0]) => <span className="text-muted-foreground">{session.started}</span>,
    },
    {
      key: "lastActivity",
      header: "Last Activity",
      render: (session: (typeof sessions)[0]) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{session.lastActivity}</span>
          {session.current && <Badge className="bg-success/20 text-success border-success/30">Current</Badge>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (session: (typeof sessions)[0]) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" disabled={session.current}>
              <LogOut className="mr-2 h-4 w-4" />
              Revoke Session
            </DropdownMenuItem>
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
          <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
          <p className="text-muted-foreground">Monitor and manage active user sessions</p>
        </div>
        <Button variant="destructive" className="gap-2">
          <LogOut className="h-4 w-4" />
          Revoke All Other Sessions
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Active Sessions</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across 2 users</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Your Sessions</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">1 current device</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Session Timeout</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">24h</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Default policy</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Active Sessions</CardTitle>
          <CardDescription>All currently active sessions in the system</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={sessions} columns={columns} />
        </CardContent>
      </Card>
    </div>
  )
}
