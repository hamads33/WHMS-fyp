"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
  Plus,
  MoreVertical,
  Play,
  Pencil,
  Trash2,
  Clock,
  Layers,
} from "lucide-react"

import cronstrue from "cronstrue"
import {
  listProfiles,
  enableProfile,
  disableProfile,
  deleteProfile,
  runProfile,
  type AutomationProfile,
} from "../../lib/automation"
import { toast } from "sonner"

interface ProfilesListProps {
  onCreateNew: () => void
  onEdit: (profile: AutomationProfile) => void
  onViewTasks: (profile: AutomationProfile) => void
}

export function ProfilesList({ onCreateNew, onEdit, onViewTasks }: ProfilesListProps) {
  // ---- FETCH PROFILES ----
  const { data, error, isLoading, mutate } = useSWR("profiles", async () => {
    const res = await listProfiles()
    if (!res.success) throw new Error(res.error || "Failed to load profiles")
    return res.data        // Always an array (due to normalization)
  })

  // Safe array fallback
  const profiles: AutomationProfile[] = Array.isArray(data) ? data : []

  // ---- LOCAL STATE ----
  const [confirmDelete, setConfirmDelete] = useState<AutomationProfile | null>(null)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setLoading = (id: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [id]: value }))
  }

  // ---- ACTION HANDLERS ----
  const handleToggleEnabled = async (profile: AutomationProfile) => {
    setLoading(profile.id, true)
    const action = profile.enabled ? disableProfile : enableProfile
    const res = await action(profile.id)

    if (res.success) {
      toast.success(profile.enabled ? "Profile disabled" : "Profile enabled")
      mutate()
    } else {
      toast.error(res.error || "Failed to update profile")
    }
    setLoading(profile.id, false)
  }

  const handleRunNow = async (profile: AutomationProfile) => {
    setLoading(profile.id, true)
    const res = await runProfile(profile.id)

    if (res.success) toast.success("Profile executed successfully")
    else toast.error(res.error || "Failed to run profile")

    setLoading(profile.id, false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return

    setLoading(confirmDelete.id, true)
    const res = await deleteProfile(confirmDelete.id)

    if (res.success) {
      toast.success("Profile deleted")
      mutate()
    } else {
      toast.error(res.error || "Failed to delete profile")
    }

    setLoading(confirmDelete.id, false)
    setConfirmDelete(null)
  }

  // ---- CRON DESCRIPTION ----
  const getCronDescription = (cron: string) => {
    try {
      return cronstrue.toString(cron, { use24HourTimeFormat: true })
    } catch {
      return cron
    }
  }

  // ---- LOADING STATE ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  // ---- ERROR STATE ----
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">
            Failed to load profiles: {error.message}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ---- MAIN UI ----
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automation Profiles</h2>
          <p className="text-muted-foreground">Manage your scheduled automation workflows</p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" /> New Profile
        </Button>
      </div>

      {/* EMPTY STATE */}
      {profiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No profiles yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first automation profile to get started.
            </p>
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="h-4 w-4" /> Create Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {profiles.map(profile => (
            <Card key={profile.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  {/* PROFILE INFO */}
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {profile.name}
                      <Badge variant={profile.enabled ? "default" : "secondary"}>
                        {profile.enabled ? "Active" : "Paused"}
                      </Badge>
                    </CardTitle>

                    {profile.description && (
                      <CardDescription>{profile.description}</CardDescription>
                    )}
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={profile.enabled}
                      onCheckedChange={() => handleToggleEnabled(profile)}
                      disabled={loadingStates[profile.id]}
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRunNow(profile)}>
                          <Play className="h-4 w-4 mr-2" /> Run Now
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onViewTasks(profile)}>
                          <Layers className="h-4 w-4 mr-2" /> View Tasks
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onEdit(profile)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setConfirmDelete(profile)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              {/* CRON DETAILS */}
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">{profile.cron}</code>
                  <span className="text-muted-foreground/70">—</span>
                  <span>{getCronDescription(profile.cron)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete “{confirmDelete?.name}”? This action
              cannot be undone and will remove associated tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
