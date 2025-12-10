"use client"

import { HardDrive, Database, FileText, Settings, Play, Download, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { backups } from "../../../lib/mock-data"

const backupTypeIcons = {
  full: HardDrive,
  database: Database,
  files: FileText,
  config: Settings,
}

export default function BackupsPage() {
  const columns = [
    {
      key: "name",
      header: "Backup",
      render: (backup: (typeof backups)[0]) => {
        const Icon = backupTypeIcons[backup.type as keyof typeof backupTypeIcons]
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-card-foreground">{backup.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{backup.type}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: "size",
      header: "Size",
      render: (backup: (typeof backups)[0]) => <span className="text-card-foreground">{backup.size}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (backup: (typeof backups)[0]) => <StatusBadge status={backup.status} />,
    },
    {
      key: "date",
      header: "Date",
      render: (backup: (typeof backups)[0]) => <span className="text-muted-foreground">{backup.date}</span>,
    },
    {
      key: "retention",
      header: "Retention",
      render: (backup: (typeof backups)[0]) => <span className="text-muted-foreground">{backup.retention}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (backup: (typeof backups)[0]) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={backup.status !== "completed"}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem>Restore</DropdownMenuItem>
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
          <h1 className="text-2xl font-bold text-foreground">Backups</h1>
          <p className="text-muted-foreground">Manage system and data backups</p>
        </div>
        <Button className="gap-2">
          <Play className="h-4 w-4" />
          Run Backup Now
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Total Storage Used</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">60.2 GB</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={60} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">of 100 GB quota</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Completed Today</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">1 scheduled remaining</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Last Successful</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">2h ago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Database Backup</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Retention Period</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Default policy</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Backup History</CardTitle>
          <CardDescription>Recent backup jobs and their status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={backups} columns={columns} />
        </CardContent>
      </Card>
    </div>
  )
}
