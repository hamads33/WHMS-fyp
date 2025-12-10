"use client"

import { useState } from "react"
import { Plus, Key, Copy, Eye, EyeOff, MoreHorizontal, Trash2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { apiKeys } from "../../../lib/mock-data"

export default function ApiKeysPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showKey, setShowKey] = useState<number | null>(null)

  const columns = [
    {
      key: "name",
      header: "API Key",
      render: (key: (typeof apiKeys)[0]) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-card-foreground">{key.name}</p>
            <div className="flex items-center gap-2">
              <code className="text-sm text-muted-foreground font-mono">
                {showKey === key.id ? "whms_prod_abc123xyz8x2k" : key.key}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowKey(showKey === key.id ? null : key.id)}
              >
                {showKey === key.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (key: (typeof apiKeys)[0]) => (
        <div className="flex gap-1">
          {key.permissions.map((perm) => (
            <Badge key={perm} variant="secondary" className="text-xs capitalize">
              {perm}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (key: (typeof apiKeys)[0]) => <StatusBadge status={key.status} />,
    },
    {
      key: "lastUsed",
      header: "Last Used",
      render: (key: (typeof apiKeys)[0]) => <span className="text-muted-foreground">{key.lastUsed}</span>,
    },
    {
      key: "created",
      header: "Created",
      render: (key: (typeof apiKeys)[0]) => <span className="text-muted-foreground">{key.created}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (key: (typeof apiKeys)[0]) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Regenerate</DropdownMenuItem>
            <DropdownMenuItem>Edit Permissions</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Revoke Key
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
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground">Manage API access credentials</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>Create a new API key with specific permissions.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input id="key-name" placeholder="Production API" />
              </div>
              <div className="grid gap-2">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="read" defaultChecked />
                    <Label htmlFor="read" className="font-normal">
                      Read
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="write" />
                    <Label htmlFor="write" className="font-normal">
                      Write
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="admin" />
                    <Label htmlFor="admin" className="font-normal">
                      Admin
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Generate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Active Keys</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">1 revoked</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>API Calls Today</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">12,847</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">+8% from yesterday</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription>Rate Limit</CardDescription>
            <CardTitle className="text-2xl text-card-foreground">10k/hr</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Per API key</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">API Keys</CardTitle>
          <CardDescription>Manage your API access credentials</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={apiKeys} columns={columns} />
        </CardContent>
      </Card>
    </div>
  )
}
