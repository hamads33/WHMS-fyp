"use client"

import { Shield, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { securityLogs } from "../../../lib/mock-data"

const severityIcons = {
  info: CheckCircle,
  warning: AlertTriangle,
  critical: XCircle,
}

export default function SecurityPage() {
  const columns = [
    {
      key: "event",
      header: "Event",
      render: (log: (typeof securityLogs)[0]) => {
        const Icon = severityIcons[log.severity as keyof typeof severityIcons]
        return (
          <div className="flex items-center gap-3">
            <Icon
              className={`h-4 w-4 ${
                log.severity === "info"
                  ? "text-success"
                  : log.severity === "warning"
                    ? "text-warning"
                    : "text-destructive"
              }`}
            />
            <span className="font-medium text-card-foreground">{log.event}</span>
          </div>
        )
      },
    },
    {
      key: "user",
      header: "User",
      render: (log: (typeof securityLogs)[0]) => <span className="text-muted-foreground">{log.user}</span>,
    },
    {
      key: "ip",
      header: "IP Address",
      render: (log: (typeof securityLogs)[0]) => (
        <span className="font-mono text-sm text-card-foreground">{log.ip}</span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (log: (typeof securityLogs)[0]) => <StatusBadge status={log.severity} />,
    },
    {
      key: "time",
      header: "Time",
      render: (log: (typeof securityLogs)[0]) => <span className="text-muted-foreground">{log.time}</span>,
    },
    {
      key: "actions",
      header: "",
      render: () => (
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      ),
      className: "w-12",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security</h1>
          <p className="text-muted-foreground">Monitor and configure security settings</p>
        </div>
        <Button className="gap-2">
          <Shield className="h-4 w-4" />
          Security Scan
        </Button>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="firewall">Firewall</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription>Events Today</CardDescription>
                <CardTitle className="text-2xl text-card-foreground">127</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription>Failed Logins</CardDescription>
                <CardTitle className="text-2xl text-destructive">8</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription>Blocked IPs</CardDescription>
                <CardTitle className="text-2xl text-card-foreground">12</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription>2FA Adoption</CardDescription>
                <CardTitle className="text-2xl text-success">78%</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Recent Security Events</CardTitle>
              <CardDescription>Latest security-related activities</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={securityLogs} columns={columns} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Authentication Settings</CardTitle>
              <CardDescription>Configure authentication requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Enforce 2FA for all admin users</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Password Complexity</Label>
                  <p className="text-sm text-muted-foreground">Require strong passwords with special characters</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">Automatically log out inactive users after 24 hours</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Login Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send email alerts for new login locations</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="firewall">
          <Card className="bg-card border-border p-6">
            <p className="text-muted-foreground">Firewall settings will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
