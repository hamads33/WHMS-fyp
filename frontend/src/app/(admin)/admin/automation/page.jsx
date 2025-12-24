"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { MoreHorizontal, Play, Trash2, Eye, Plus } from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"

/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */

const normalizeProfiles = (data = []) =>
  data.map((p) => ({
    id: p.id,
    name: p.name,
    cron: p.cron,
    enabled: Boolean(p.enabled),
    taskCount: p.taskCount ?? 0,
    lastRunStatus: p.lastRunStatus ?? null,
    lastRunAt: p.lastRunAt ?? null,
  }))

const statusBadge = (enabled) => (
  <Badge
    className={
      enabled
        ? "bg-green-100 text-green-800"
        : "bg-gray-100 text-gray-800"
    }
  >
    {enabled ? "Enabled" : "Disabled"}
  </Badge>
)

const lastRunBadge = (status) => {
  if (!status) return <span className="text-muted-foreground">—</span>

  const map = {
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    running: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
  }

  return (
    <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>
      {status}
    </Badge>
  )
}

/* -----------------------------------------------------
   Page
----------------------------------------------------- */

export default function AutomationPage() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* ------------------------------------------------- */
  /* Load profiles                                    */
  /* ------------------------------------------------- */
  useEffect(() => {
    let active = true

    async function loadProfiles() {
      setLoading(true)
      setError(null)

      try {
        const res = await AutomationAPI.listProfiles()
        if (!active) return
        setProfiles(normalizeProfiles(res?.data ?? []))
      } catch {
        if (active) setError("Failed to load automation profiles")
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfiles()
    return () => {
      active = false
    }
  }, [])

  /* ------------------------------------------------- */
  /* Actions                                          */
  /* ------------------------------------------------- */
  const handleToggleStatus = async (profile) => {
    if (profile.enabled) {
      await AutomationAPI.disableProfile(profile.id)
    } else {
      await AutomationAPI.enableProfile(profile.id)
    }

    // reload from source of truth
    const res = await AutomationAPI.listProfiles()
    setProfiles(normalizeProfiles(res?.data ?? []))
  }

  const handleDelete = async (id) => {
    await AutomationAPI.deleteProfile(id)
    setProfiles((prev) => prev.filter((p) => p.id !== id))
  }

  const handleRun = async (id) => {
    await AutomationAPI.runProfile(id)
  }

  /* ------------------------------------------------- */
  /* Render                                           */
  /* ------------------------------------------------- */
  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading automation profiles…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Automation Profiles
          </h1>
          <p className="text-muted-foreground">
            Manage and monitor your automation workflows
          </p>
        </div>

        <Link href="/admin/automation/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Profile
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Schedule (Cron)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Tasks</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">
                  {profile.name}
                </TableCell>

                <TableCell className="font-mono text-sm text-muted-foreground">
                  {profile.cron}
                </TableCell>

                <TableCell>
                  {statusBadge(profile.enabled)}
                </TableCell>

                <TableCell className="text-center">
                  {profile.taskCount}
                </TableCell>

                <TableCell className="space-y-1">
                  {lastRunBadge(profile.lastRunStatus)}
                  {profile.lastRunAt && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(profile.lastRunAt).toLocaleString()}
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/admin/automation/${profile.id}`}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleRun(profile.id)}
                        disabled={!profile.enabled}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Run
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(profile)}
                      >
                        {profile.enabled ? "Disable" : "Enable"}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDelete(profile.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {profiles.length === 0 && (
        <div className="mt-6 text-center text-muted-foreground">
          No automation profiles yet.
        </div>
      )}
    </div>
  )
}
