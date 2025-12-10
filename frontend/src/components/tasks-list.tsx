"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  ArrowLeft,
  Plus,
  MoreVertical,
  Play,
  Pencil,
  Trash2,
  Zap,
  Clock,
  GripVertical,
} from "lucide-react"

import cronstrue from "cronstrue"
import {
  listTasks,
  deleteTask,
  runTask,
  type AutomationProfile,
  type AutomationTask,
} from "../../lib/automation"
import { toast } from "sonner"

interface TasksListProps {
  profile: AutomationProfile
  onBack: () => void
  onAddTask: () => void
  onEditTask: (task: AutomationTask) => void
}

export function TasksList({ profile, onBack, onAddTask, onEditTask }: TasksListProps) {
  const { data, error, isLoading, mutate } = useSWR(
    `tasks-${profile.id}`,
    async () => {
      const res = await listTasks(profile.id)
      if (!res.success) throw new Error(res.error || "Failed to fetch tasks")
      return Array.isArray(res.data) ? res.data : []
    }
  )

  const tasks: AutomationTask[] = Array.isArray(data) ? data : []
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order)

  // ---- STATES ----
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<AutomationTask | null>(null)

  const setLoading = (id: string, v: boolean) =>
    setLoadingStates(prev => ({ ...prev, [id]: v }))

  // ---- PARSE ACTION ----
  const parseActionType = (type: string) => {
    if (!type.startsWith("plugin:")) {
      return { type: "builtin", display: type }
    }

    const parts = type.split(":")
    return {
      type: "plugin",
      pluginId: parts[1],
      action: parts[2],
      display: `${parts[1]} / ${parts[2]}`,
    }
  }

  // ---- RUN TASK ----
  const handleRunTask = async (task: AutomationTask) => {
    setLoading(task.id, true)
    const res = await runTask(task.id)

    if (res.success) toast.success("Task executed")
    else toast.error(res.error || "Failed to execute task")

    setLoading(task.id, false)
  }

  // ---- DELETE TASK ----
  const handleDeleteTask = async () => {
    if (!deleteTarget) return

    setLoading(deleteTarget.id, true)
    const res = await deleteTask(deleteTarget.id)

    if (res.success) {
      toast.success("Task deleted")
      mutate()
    } else {
      toast.error(res.error || "Failed to delete")
    }

    setLoading(deleteTarget.id, false)
    setDeleteTarget(null)
  }

  // ---- CRON DESCRIPTION ----
  const getCronDesc = (cron: string) => {
    try {
      return cronstrue.toString(cron, { use24HourTimeFormat: true })
    } catch {
      return cron
    }
  }

  // ---- LOADING ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  // ---- ERROR ----
  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load tasks: {String(error.message)}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => mutate()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- UI ----
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{profile.name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <code className="bg-muted px-2 py-0.5 rounded text-xs">
              {profile.cron}
            </code>
            <span>— {getCronDesc(profile.cron)}</span>
          </div>
        </div>

        <Button onClick={onAddTask} className="gap-2">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      {profile.description && (
        <p className="text-muted-foreground">{profile.description}</p>
      )}

      {/* EMPTY */}
      {sortedTasks.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No tasks yet</h3>
            <p className="text-muted-foreground mb-4">
              Add tasks that run when this profile triggers.
            </p>
            <Button onClick={onAddTask} className="gap-2">
              <Plus className="h-4 w-4" /> Add Task
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TASK LIST */}
      {sortedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Tasks ({sortedTasks.length})
          </h3>

          {sortedTasks.map((task, idx) => {
            const parsed = parseActionType(task.actionType)

            return (
              <Card key={task.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="w-6 font-medium text-sm">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{parsed.display}</span>
                      <Badge variant={parsed.type === "plugin" ? "secondary" : "outline"}>
                        {parsed.type}
                      </Badge>
                    </div>

                    {!!Object.keys(task.actionMeta || {}).length && (
                      <code className="text-xs mt-1 block truncate text-muted-foreground">
                        {JSON.stringify(task.actionMeta)}
                      </code>
                    )}
                  </div>

                  {/* MENU */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={loadingStates[task.id]}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRunTask(task)}>
                        <Play className="h-4 w-4 mr-2" /> Run Now
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onEditTask(task)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(task)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* DELETE DIALOG */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
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
