"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TaskFlow } from "@/components/automation/task-flow"
import { ActionPalette } from "@/components/automation/action-palette"
import { TaskConfigDrawer } from "@/components/automation/task-config-drawer"
import { ExecutionLogPanel } from "@/components/automation/execution-log-panel"

import {
  Play,
  ArrowLeft,
  Wrench,
  History,
  XCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"
import { ConfirmDialog } from "@/components/automation/confirm-dialog"

/* Route: app/(admin)/admin/automation/[profileId]/page.jsx */

export default function ProfileDetailPage() {
  const params = useParams()
  const profileId = params.profileId

  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [showConfigDrawer, setShowConfigDrawer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTaskTarget, setDeleteTaskTarget] = useState(null)

  /* Load Profile & Tasks */
  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const profileRes = await AutomationAPI.getProfile(profileId)
        if (!mounted) return
        setProfile(profileRes.data)

        const tasksRes = await AutomationAPI.listTasks(profileId)
        if (!mounted) return

        const normalizedTasks = (tasksRes.data || []).map((task) => ({
          id: task.id,
          order: task.order,
          actionType: task.actionType,
          displayName: task.actionType,
          actionMeta: task.actionMeta || {},
          actionSchema: task.actionSchema || null,
        }))

        setTasks(normalizedTasks.sort((a, b) => a.order - b.order))
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Failed to load profile")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [profileId])

  /* Handlers */
  const handleAddTask = async (action) => {
    try {
      if (!action?.actionType) {
        throw new Error("Invalid action selected (missing actionType)")
      }

      const nextOrder =
        tasks.length > 0
          ? Math.max(...tasks.map(t => t.order ?? 0)) + 1
          : 0

      const payload = {
        actionType: action.actionType,
        order: nextOrder,
        actionMeta: {},
      }

      const res = await AutomationAPI.createTask(profileId, payload)

      setTasks(prev =>
        [...prev, {
          id: res.data.id,
          order: res.data.order,
          actionType: res.data.actionType,
          displayName: action.displayName,
          actionMeta: res.data.actionMeta ?? {},
          actionSchema: action.actionSchema || null,
        }].sort((a, b) => a.order - b.order)
      )
    } catch (err) {
      console.error("Add task failed:", err)
      showToast(
        err?.response?.data?.error?.message ||
        err.message ||
        "Failed to add task",
        "error"
      )
    }
  }

  const handleRemoveTask = async (taskId) => {
    try {
      // ✅ FIXED: Now passes profileId as first parameter
      await AutomationAPI.deleteTask(profileId, taskId)

      const remainingTasks = tasks.filter((t) => t.id !== taskId)
      const reorderedTasks = remainingTasks.map((t, idx) => ({
        ...t,
        order: idx,
      }))
      setTasks(reorderedTasks)

      for (let i = 0; i < reorderedTasks.length; i++) {
        // ✅ FIXED: Now passes profileId as first parameter
        await AutomationAPI.updateTask(profileId, reorderedTasks[i].id, {
          actionType: reorderedTasks[i].actionType,
          order: i,
          actionMeta: reorderedTasks[i].actionMeta,
        })
      }
    } catch (err) {
      console.error("Failed to remove task:", err)
      showToast(err?.message || "Failed to remove task", "error")
    }
  }

  const handleConfigureTask = (taskId) => {
    setSelectedTaskId(taskId)
    setShowConfigDrawer(true)
  }

  const handleSaveTaskConfig = async (taskId, meta) => {
    try {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      // ✅ FIXED: Now passes profileId as first parameter
      await AutomationAPI.updateTask(profileId, taskId, {
        actionType: task.actionType,
        order: task.order,
        actionMeta: meta,
      })

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, actionMeta: meta } : t))
      )

      setShowConfigDrawer(false)
      setSelectedTaskId(null)
    } catch (err) {
      console.error("Failed to save task configuration:", err)
      showToast(err?.message || "Failed to save task configuration", "error")
    }
  }

  const [toast, setToast] = useState(null)
  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleRunProfile = async () => {
    try {
      await AutomationAPI.runProfile(profileId)
      showToast("Profile run started")
    } catch (err) {
      console.error("Failed to run profile:", err)
      showToast(err?.message || "Failed to run profile", "error")
    }
  }

  const handleRunTask = async (taskId) => {
    try {
      await AutomationAPI.runTask(taskId)
      showToast("Task run started")
    } catch (err) {
      console.error("Failed to run task:", err)
      showToast(err?.message || "Failed to run task", "error")
    }
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId)

  /* Loading state */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-5">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-20 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  /* Error state */
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Failed to Load Profile</h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Link href="/admin/automation">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Profiles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Left: back + info */}
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/admin/automation"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Profiles
            </Link>

            <div className="w-px h-6 bg-border shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold leading-tight truncate">
                  {profile.name}
                </h1>
                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden sm:inline">
                  {profile.cron}
                </code>
                <Badge
                  className={
                    profile.enabled
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 font-medium text-xs"
                      : "bg-gray-100 text-gray-500 border-gray-200 font-medium text-xs"
                  }
                  variant="outline"
                >
                  <span
                    className={`mr-1 inline-block w-1.5 h-1.5 rounded-full ${
                      profile.enabled ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />
                  {profile.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {profile.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {profile.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: run button */}
          <Button onClick={handleRunProfile} className="gap-2 shrink-0">
            <Play className="w-4 h-4" />
            Run Profile
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="builder">
          <TabsList className="mb-6">
            <TabsTrigger value="builder" className="gap-2">
              <Wrench className="w-4 h-4" />
              Task Builder
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="w-4 h-4" />
              Execution History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Actions Palette */}
              <ActionPalette onSelectAction={handleAddTask} />

              {/* Task Flow */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Task Flow</CardTitle>
                  <CardDescription>
                    {tasks.length} task{tasks.length !== 1 && "s"} configured
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <TaskFlow
                    tasks={tasks}
                    onConfigure={handleConfigureTask}
                    onRemove={(taskId) => setDeleteTaskTarget(tasks.find(t => t.id === taskId))}
                    onRunTask={handleRunTask}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardContent className="pt-6">
                <ExecutionLogPanel profileId={profileId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === "error" ? "bg-destructive" : "bg-green-600"}`}>
          {toast.type === "error" ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Step delete confirmation */}
      <ConfirmDialog
        open={!!deleteTaskTarget}
        onOpenChange={(open) => !open && setDeleteTaskTarget(null)}
        title="Remove this step?"
        description={`"${deleteTaskTarget?.displayName || deleteTaskTarget?.actionType || "This step"}" will be removed from the workflow.`}
        confirmLabel="Remove Step"
        onConfirm={() => {
          handleRemoveTask(deleteTaskTarget?.id)
          setDeleteTaskTarget(null)
        }}
      />

      {/* Config Drawer */}
      <TaskConfigDrawer
        task={selectedTask}
        isOpen={showConfigDrawer}
        onClose={() => {
          setShowConfigDrawer(false)
          setSelectedTaskId(null)
        }}
        onSave={handleSaveTaskConfig}
      />
    </div>
  )
}
