"use client"

import { useState } from "react"
import { Plus, Webhook, Send, MoreHorizontal, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { webhooks } from "../../../lib/mock-data"

export default function WebhooksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const columns = [
    {
      key: "name",
      header: "Webhook",
      render: (webhook: (typeof webhooks)[0]) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Webhook className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-card-foreground">{webhook.name}</p>
            <code className="text-xs text-muted-foreground">{webhook.url}</code>
          </div>
        </div>
      ),
    },
    {
      key: "events",
      header: "Events",
      render: (webhook: (typeof webhooks)[0]) => (
        <div className="flex flex-wrap gap-1">
          {webhook.events.map((event) => (
            <Badge key={event} variant="secondary" className="text-xs">
              {event}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (webhook: (typeof webhooks)[0]) => <StatusBadge status={webhook.status} />,
    },
    {
      key: "lastTriggered",
      header: "Last Triggered",
      render: (webhook: (typeof webhooks)[0]) => <span className="text-muted-foreground">{webhook.lastTriggered}</span>,
    },
    {
      key: "enabled",
      header: "Enabled",
      render: (webhook: (typeof webhooks)[0]) => <Switch checked={webhook.status !== "failing"} />,
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
            <DropdownMenuItem>
              <Send className="mr-2 h-4 w-4" />
              Test Webhook
            </DropdownMenuItem>
            <DropdownMenuItem>
              <RefreshCw className="mr-2 h-4 w-4" />
              View Logs
            </DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
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
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-muted-foreground">Configure event notifications to external services</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>Set up a new webhook endpoint to receive event notifications.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="webhook-name">Name</Label>
                <Input id="webhook-name" placeholder="Slack Notifications" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input id="webhook-url" placeholder="https://example.com/webhook" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="webhook-secret">Secret (optional)</Label>
                <Input id="webhook-secret" type="password" placeholder="Signing secret" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Active Webhooks</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">1 failing</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Events Today</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">847</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">98.2% delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">234ms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Configured Webhooks</CardTitle>
          <CardDescription>Manage your webhook endpoints</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={webhooks} columns={columns} />
        </CardContent>
      </Card>
    </div>
  )
}
