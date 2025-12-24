"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Settings2, Trash2, Play } from "lucide-react"

/**
 * TaskFlow
 * ----------------------------------------------------
 * Displays ordered automation tasks
 * Defensive against incomplete task objects
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

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        // ✅ Defensive normalization
        const actionType = task?.actionType ?? ""
        const isPlugin = actionType.startsWith("plugin:")

        return (
          <Card
            key={task.id ?? index}
            className="p-3 border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Order */}
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">
                {index + 1}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {task.displayName || actionType || "Unnamed Task"}
                </p>

                <Badge variant="outline" className="mt-1 text-xs">
                  {isPlugin ? "🔌 Plugin" : "🔧 Built-in"}
                </Badge>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRunTask?.(task.id)}
                  title="Run task"
                  disabled={!task.id}
                >
                  <Play className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onConfigure?.(task.id)}
                  title="Configure task"
                  disabled={!task.id}
                >
                  <Settings2 className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove?.(task.id)}
                  className="text-destructive"
                  title="Remove task"
                  disabled={!task.id}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {/* Visual reorder handle (future drag & drop) */}
                <div className="pl-1 text-muted-foreground">
                  <GripVertical className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
