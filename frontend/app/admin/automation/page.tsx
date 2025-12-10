"use client"

import { useState } from "react"
import { Plus, Clock, Zap, MoreHorizontal, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { automations } from "../../../lib/mock-data"

export default function AutomationPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const columns = [
    {
      key: "name",
      header: "Automation",
      render: (auto: (typeof automations)[0]) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            {auto.trigger === "cron" ? (
              <Clock className="h-4 w-4 text-primary" />
            ) : (
              <Zap className="h-4 w-4 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-card-foreground">{auto.name}</p>
            <p className="text-sm text-muted-foreground font-mono">{auto.schedule}</p>
          </div>
        </div>
      ),
    },
    {
      key: "trigger",
      header: "Trigger",
      render: (auto: (typeof automations)[0]) => (
        <span className="capitalize text-card-foreground">{auto.trigger}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (auto: (typeof automations)[0]) => <StatusBadge status={auto.status} />,
    },
    {
      key: "lastRun",
      header: "Last Run",
      render: (auto: (typeof automations)[0]) => <span className="text-muted-foreground">{auto.lastRun}</span>,
    },
    {
      key: "nextRun",
      header: "Next Run",
      render: (auto: (typeof automations)[0]) => <span className="text-muted-foreground">{auto.nextRun}</span>,
    },
    {
      key: "toggle",
      header: "Enabled",
      render: (auto: (typeof automations)[0]) => <Switch checked={auto.status === "active"} />,
    },
    {
      key: "actions",
      header: "",
      render: (auto: (typeof automations)[0]) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Play className="mr-2 h-4 w-4" />
              Run Now
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pause className="mr-2 h-4 w-4" />
              {auto.status === "active" ? "Pause" : "Resume"}
            </DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>View Logs</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
          <h1 className="text-2xl font-bold text-foreground">Automation</h1>
          <p className="text-muted-foreground">Configure scheduled tasks and event triggers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Automation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
              <DialogDescription>Set up a new scheduled task or event-triggered automation.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="auto-name">Name</Label>
                <Input id="auto-name" placeholder="Daily Report" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trigger-type">Trigger Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cron">Cron Schedule</SelectItem>
                    <SelectItem value="event">Event Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="schedule">Schedule / Event</Label>
                <Input id="schedule" placeholder="0 0 * * * or on_client_create" />
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
            <CardDescription>Active Automations</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">1 paused</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Runs Today</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">47</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">2 failed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">95.7%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Configured Automations</CardTitle>
          <CardDescription>Manage your scheduled tasks and triggers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={automations} columns={columns} />
        </CardContent>
      </Card>
    </div>
  )
}
