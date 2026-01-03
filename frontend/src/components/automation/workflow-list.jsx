"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Play, Edit2, Trash2, Zap } from "lucide-react"

export function WorkflowList({
  workflows,
  onEdit,
  onDelete,
  onRun,
}) {
  const getTypeColor = (type) => {
    const colors = {
      sequential: "bg-blue-100 text-blue-800",
      parallel: "bg-purple-100 text-purple-800",
      conditional: "bg-amber-100 text-amber-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  const getTriggerColor = (trigger) => {
    const colors = {
      manual: "bg-green-100 text-green-800",
      scheduled: "bg-orange-100 text-orange-800",
      webhook: "bg-pink-100 text-pink-800",
    }
    return colors[trigger] || "bg-gray-100 text-gray-800"
  }

  if (workflows.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    {workflow.name}
                  </CardTitle>
                </div>
                {workflow.description && (
                  <CardDescription>{workflow.description}</CardDescription>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onEdit(workflow)}
                    className="gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRun(workflow.id)}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(workflow.id)}
                    className="text-destructive gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge className={getTypeColor(workflow.type)}>
                {workflow.type}
              </Badge>
              <Badge className={getTriggerColor(workflow.trigger)}>
                {workflow.trigger}
              </Badge>

              {workflow.definition?.tasks && (
                <Badge variant="outline">
                  {workflow.definition.tasks.length} task
                  {workflow.definition.tasks.length !== 1 && "s"}
                </Badge>
              )}

              {workflow.enabled && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              )}

              {workflow.stats && (
                <div className="ml-auto text-xs text-muted-foreground space-x-3">
                  {workflow.stats.totalRuns > 0 && (
                    <span>
                      Runs: {workflow.stats.totalRuns} (
                      {workflow.stats.successCount} success,{" "}
                      {workflow.stats.failureCount} failed)
                    </span>
                  )}
                </div>
              )}
            </div>

            {workflow.lastRunAt && (
              <p className="text-xs text-muted-foreground mt-3">
                Last run: {new Date(workflow.lastRunAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}