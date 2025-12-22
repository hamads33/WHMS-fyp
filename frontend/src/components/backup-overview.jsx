"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Play } from "lucide-react"
import { CreateBackupModal } from "./create-backup-modal"
import { backupApi } from "@/lib/api/backupClient"

export function BackupOverview() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [running, setRunning] = useState(false)

  const loadBackups = async () => {
    try {
      setLoading(true)
      setError(null)
      // FIX: Use empty string because backupApi now handles the base prefix correctly
      const res = await backupApi("")
      // FIX: Backend returns results inside 'data' property
      setBackups(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setError(e.message || "Failed to load backups")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBackups()
    const i = setInterval(loadBackups, 10000)
    return () => clearInterval(i)
  }, [])

  const runBackupNow = async () => {
    try {
      setRunning(true)
      // FIX: Trigger immediate backup; path resolves to POST /api/backups
      await backupApi("", {
        method: "POST",
        body: JSON.stringify({ type: "full" }),
      })
      loadBackups()
    } catch (e) {
      setError(e.message || "Failed to start backup")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Backups</h1>
            <p className="text-muted-foreground mt-2">Create, manage, download, and restore backups</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={runBackupNow} disabled={running} className="gap-2">
              <Play className="w-4 h-4" />
              {running ? "Running…" : "Run Backup Now"}
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Backup
            </Button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Recent Backups</CardTitle>
            <CardDescription>All backup jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && backups.length === 0 ? (
              <p className="text-muted-foreground">Loading backups…</p>
            ) : backups.length === 0 ? (
              <p className="text-muted-foreground">No backups found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell><Badge variant="secondary">{b.type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'failed' ? 'destructive' : 'default'}>{b.status}</Badge>
                      </TableCell>
                      <TableCell>{b.sizeBytes ? `${(b.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "-"}</TableCell>
                      <TableCell>{new Date(b.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/backups/${b.id}/download`)}>Download</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => backupApi(`/${b.id}/restore`, { method: "POST", body: JSON.stringify({ restoreFiles: true, restoreDb: false }) })}>Restore</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <CreateBackupModal open={createOpen} onOpenChange={setCreateOpen} onCreated={loadBackups} />
      </div>
    </div>
  )
}