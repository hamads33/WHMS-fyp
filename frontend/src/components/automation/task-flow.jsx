"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Settings2, Trash2, Play } from "lucide-react"

/**
 * TaskFlow
 * ----------------------------------------------------
 * Displays ordered automation tasks
 */
export function TaskFlow({
  tasks = [],
  onConfigure,
  onRemove,
  onRunTask,
}) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No tasks added yet. Select an action to build your workflow.
      </Card>
    )
  }

  const isConfigured = (task) => {
    const required = task?.actionSchema?.required
    if (!required?.length) return true

    return required.every(
      (key) =>
        task.actionMeta?.[key] !== undefined &&
        task.actionMeta?.[key] !== ""
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const actionType = task?.actionType ?? ""
        const plugin = actionType.startsWith("plugin:")
        const configured = isConfigured(task)

        return (
          <Card
            key={task.id}
            className="p-3 border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Order */}
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {index + 1}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {task.displayName || actionType}
                </p>

                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {plugin ? "🔌 Plugin" : "🔧 Built-in"}
                  </Badge>

                  <Badge
                    variant={configured ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {configured ? "Configured" : "Not Configured"}
                  </Badge>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRunTask?.(task.id)}
                  disabled={!configured}
                  title="Run task"
                >
                  <Play className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onConfigure?.(task.id)}
                  title="Configure task"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove?.(task.id)}
                  className="text-destructive"
                  title="Remove task"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <GripVertical className="w-4 h-4 text-muted-foreground ml-1" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
