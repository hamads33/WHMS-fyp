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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TaskFlow } from "@/components/automation/task-flow"
import { ActionPalette } from "@/components/automation/action-palette"
import { TaskConfigDrawer } from "@/components/automation/task-config-drawer"
import { ExecutionLogPanel } from "@/components/automation/execution-log-panel"

import { Play, ArrowLeft } from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"

export default function ProfileDetailPage() {
  const params = useParams()
  const profileId = params.profileId

  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [showConfigDrawer, setShowConfigDrawer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* --------------------------------------------------
     Load Profile & Tasks
  -------------------------------------------------- */
  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        // Load profile details
        const profileRes = await AutomationAPI.getProfile(profileId)
        if (!mounted) return
        setProfile(profileRes.data)

        // Load tasks for this profile
        const tasksRes = await AutomationAPI.listTasks(profileId)
        if (!mounted) return

        const normalizedTasks = (tasksRes.data || []).map((task) => ({
          id: task.id,
          order: task.order,
          actionType: task.actionType,
          displayName: task.actionType,
          actionMeta: task.actionMeta || {},
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

  /* --------------------------------------------------
     Actions
  -------------------------------------------------- */

const handleAddTask = async (action) => {
  try {
    if (!action?.actionType) {
      throw new Error("Invalid action selected (missing actionType)");
    }

    const nextOrder =
      tasks.length > 0
        ? Math.max(...tasks.map(t => t.order ?? 0)) + 1
        : 0;

    const payload = {
      actionType: action.actionType, // now correctly populated
      order: nextOrder,
      actionMeta: {}
    };

    const res = await AutomationAPI.createTask(profileId, payload);

    setTasks(prev =>
      [...prev, {
        id: res.data.id,
        order: res.data.order,
        actionType: res.data.actionType,
        displayName: action.displayName,
        actionMeta: res.data.actionMeta ?? {}
      }].sort((a, b) => a.order - b.order)
    );

  } catch (err) {
    console.error("Add task failed:", err?.response?.data || err);
    alert(
      err?.response?.data?.error?.message ||
      err.message ||
      "Failed to add task"
    );
  }
};

  const handleRemoveTask = async (taskId) => {
    try {
      await AutomationAPI.deleteTask(taskId)

      // Remove from UI and reorder
      const remainingTasks = tasks.filter((t) => t.id !== taskId)
      
      // Update local state immediately with new order
      const reorderedTasks = remainingTasks.map((t, idx) => ({ 
        ...t, 
        order: idx 
      }))
      setTasks(reorderedTasks)

      // Update order on backend for remaining tasks
      for (let i = 0; i < reorderedTasks.length; i++) {
        await AutomationAPI.updateTask(reorderedTasks[i].id, {
          actionType: reorderedTasks[i].actionType,
          order: i,
          actionMeta: reorderedTasks[i].actionMeta,
        })
      }
    } catch (err) {
      console.error("Failed to remove task:", err)
      alert(err?.message || "Failed to remove task")
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

      // Send complete task data with updated meta
      await AutomationAPI.updateTask(taskId, {
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
      alert(err?.message || "Failed to save task configuration")
    }
  }

  const handleRunProfile = async () => {
    try {
      await AutomationAPI.runProfile(profileId)
      alert("Profile execution started")
    } catch (err) {
      console.error("Failed to run profile:", err)
      alert(err?.message || "Failed to run profile")
    }
  }

  const handleRunTask = async (taskId) => {
    try {
      await AutomationAPI.runTask(taskId)
      alert("Task execution started")
    } catch (err) {
      console.error("Failed to run task:", err)
      alert(err?.message || "Failed to run task")
    }
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId)

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Link href="/admin/automation">
            <Button variant="outline">Back to Profiles</Button>
          </Link>
        </div>
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
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-start">
          <div>
            <Link
              href="/admin/automation"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profiles
            </Link>
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            {profile.description && (
              <p className="text-muted-foreground mt-1">
                {profile.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Schedule: <span className="font-mono">{profile.cron}</span>
            </p>
          </div>

          <Button onClick={handleRunProfile} className="gap-2">
            <Play className="w-4 h-4" />
            Run Profile
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="builder">
          <TabsList className="mb-6">
            <TabsTrigger value="builder">Task Builder</TabsTrigger>
            <TabsTrigger value="logs">Execution Logs</TabsTrigger>
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
                    onRemove={handleRemoveTask}
                    onRunTask={handleRunTask}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <ExecutionLogPanel profileId={profileId} />
          </TabsContent>
        </Tabs>
      </div>

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