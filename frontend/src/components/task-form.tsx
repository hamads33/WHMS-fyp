"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { ArrowLeft, Save, Zap, Puzzle } from "lucide-react"

import {
  createTask,
  updateTask,
  listBuiltInActions,
  type AutomationProfile,
  type AutomationTask,
} from "../../lib/automation"

import { listPlugins, listPluginActions } from "../../lib/plugins"
import { toast } from "sonner"

interface TaskFormProps {
  profile: AutomationProfile
  task?: AutomationTask | null
  onBack: () => void
  onSaved: () => void
}

type ActionSource = "builtin" | "plugin"

export function TaskForm({ profile, task, onBack, onSaved }: TaskFormProps) {
  const isEditing = !!task

  // -------------------------------------
  // FETCH BUILT-IN ACTIONS
  // -------------------------------------

  const { data: builtInActions, isLoading: loadingBuiltIn } = useSWR(
    "builtin-actions",
    async () => {
      const res = await listBuiltInActions()
      if (!res.success) throw new Error(res.error)
      return Array.isArray(res.data) ? res.data : []
    }
  )

  // -------------------------------------
  // FETCH PLUGINS
  // -------------------------------------

  const { data: plugins, isLoading: loadingPlugins } = useSWR(
    "plugins",
    async () => {
      const res = await listPlugins()
      if (!res.success) throw new Error(res.error)
      return Array.isArray(res.data) ? res.data : []
    }
  )

  // -------------------------------------
  // FORM STATE
  // -------------------------------------
  const [source, setSource] = useState<ActionSource>("builtin")
  const [selectedPluginId, setSelectedPluginId] = useState("")
  const [selectedActionId, setSelectedActionId] = useState("")

  const [actionMeta, setActionMeta] = useState("{}")
  const [order, setOrder] = useState(task?.order ?? 0)
  const [saving, setSaving] = useState(false)

  // -------------------------------------
  // FETCH PLUGIN ACTIONS WHEN PLUGIN SELECTED
  // -------------------------------------
  const { data: pluginActions, isLoading: loadingPluginActions } = useSWR(
    source === "plugin" && selectedPluginId ? `actions:${selectedPluginId}` : null,
    async () => {
      const res = await listPluginActions(selectedPluginId)
      if (!res.success) throw new Error(res.error)
      return Array.isArray(res.data) ? res.data : []
    }
  )

  // -------------------------------------
  // PREFILL FIELDS IN EDIT MODE
  // -------------------------------------
  useEffect(() => {
    if (!task) return

    if (task.actionType.startsWith("plugin:")) {
      const [, pluginId, actionId] = task.actionType.split(":")

      setSource("plugin")
      setSelectedPluginId(pluginId || "")
      setSelectedActionId(actionId || "")
    } else {
      setSource("builtin")
      setSelectedActionId(task.actionType)
    }

    setActionMeta(JSON.stringify(task.actionMeta || {}, null, 2))
    setOrder(task.order ?? 0)
  }, [task])

  // -------------------------------------
  // SAVE HANDLER
  // -------------------------------------
  const handleSubmit = async () => {
    if (!selectedActionId) {
      toast.error("Please select an action")
      return
    }

    // Validate JSON
    let parsedMeta: Record<string, any> = {}
    try {
      parsedMeta = JSON.parse(actionMeta || "{}")
    } catch {
      toast.error("Invalid JSON in Action Meta")
      return
    }

    const actionType =
      source === "plugin"
        ? `plugin:${selectedPluginId}:${selectedActionId}`
        : selectedActionId

    const payload = {
      actionType,
      actionMeta: parsedMeta,
      order,
    }

    setSaving(true)

    const res = isEditing
      ? await updateTask(task!.id, payload)
      : await createTask(profile.id, payload)

    setSaving(false)

    if (!res.success) {
      toast.error(res.error || "Failed to save task")
      return
    }

    toast.success(isEditing ? "Task updated" : "Task created")
    onSaved()
  }

  // -------------------------------------
  // LOADING UI
  // -------------------------------------

  const loading = loadingBuiltIn || loadingPlugins

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // -------------------------------------
  // MAIN UI
  // -------------------------------------

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Task" : "New Task"}
          </h2>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update the task configuration"
              : `Add a task to "${profile.name}"`}
          </p>
        </div>
      </div>

      {/* ACTION SOURCE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Action Selection
          </CardTitle>
          <CardDescription>Select the action type to execute</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Built-in vs Plugin */}
          <div className="space-y-2">
            <Label>Action Source</Label>
            <Select
              value={source}
              onValueChange={(v: ActionSource) => {
                setSource(v)
                setSelectedPluginId("")
                setSelectedActionId("")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose action source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="builtin">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Built-in Actions
                  </div>
                </SelectItem>

                <SelectItem value="plugin">
                  <div className="flex items-center gap-2">
                    <Puzzle className="h-4 w-4" />
                    Plugin Actions
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PLUGIN SELECT */}
          {source === "plugin" && (
            <div className="space-y-2">
              <Label>Plugin</Label>
              <Select
                value={selectedPluginId}
                onValueChange={setSelectedPluginId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plugin" />
                </SelectTrigger>
                <SelectContent>
                  {(plugins || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ACTION SELECT */}
          <div className="space-y-2">
            <Label>Action</Label>

            {/* BUILT-IN ACTION DROPDOWN */}
            {source === "builtin" && (
              <Select
                value={selectedActionId}
                onValueChange={setSelectedActionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  {(builtInActions || []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div>
                        <div>{a.name}</div>
                        {a.description && (
                          <div className="text-xs text-muted-foreground">
                            {a.description}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* PLUGIN ACTION DROPDOWN */}
            {source === "plugin" && (
              <Select
                value={selectedActionId}
                disabled={!selectedPluginId || loadingPluginActions}
                onValueChange={setSelectedActionId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingPluginActions
                        ? "Loading..."
                        : "Select plugin action"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(pluginActions || []).map((action) => (
                    <SelectItem key={action.id} value={action.id}>
                      <div>
                        <div>{action.name}</div>
                        {action.description && (
                          <div className="text-xs text-muted-foreground">
                            {action.description}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

        </CardContent>
      </Card>

      {/* ACTION META */}
      <Card>
        <CardHeader>
          <CardTitle>Action Configuration</CardTitle>
          <CardDescription>Define action parameters (JSON)</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Action Meta (JSON)</Label>
            <Textarea
              className="font-mono text-sm"
              rows={6}
              value={actionMeta}
              onChange={(e) => setActionMeta(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Execution Order</Label>
            <Input
              type="number"
              min={0}
              value={order}
              onChange={(e) =>
                setOrder(Number(e.target.value) || 0)
              }
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">
              Lower order → executed earlier
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SAVE BUTTONS */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          className="gap-2"
          disabled={saving || !selectedActionId}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : isEditing ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </div>
  )
}
