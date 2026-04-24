/**
 * Workflow List Component - FIXED
 * ==================================================
 * Displays list of workflows with CRUD actions
 */

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
  const getStatusColor = (enabled) => {
    return enabled
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800"
  }

  const getStatusBadge = (enabled) => {
    return enabled ? "Active" : "Inactive"
  }

  if (!workflows || workflows.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Workflow Name */}
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    {workflow.name}
                  </CardTitle>
                </div>

                {/* Description */}
                {workflow.description && (
                  <CardDescription>{workflow.description}</CardDescription>
                )}
              </div>

              {/* Action Menu */}
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
              {/* Status Badge */}
              <Badge className={getStatusColor(workflow.enabled)}>
                {getStatusBadge(workflow.enabled)}
              </Badge>

              {/* Task Count */}
              {workflow.definition?.tasks && (
                <Badge variant="outline">
                  {workflow.definition.tasks.length} task
                  {workflow.definition.tasks.length !== 1 && "s"}
                </Badge>
              )}

              {/* Version */}
              {workflow.version && (
                <Badge variant="outline">
                  v{workflow.version}
                </Badge>
              )}

              {/* Execution Count - Uses _count.runs from API */}
              {workflow._count?.runs > 0 && (
                <Badge variant="outline" className="ml-auto">
                  Runs: {workflow._count.runs}
                </Badge>
              )}
            </div>

            {/* Last Run Info - Uses runs array from API */}
            {workflow.runs?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Last run: {new Date(workflow.runs[0].createdAt).toLocaleString()}
              </p>
            )}

            {/* Created Info */}
            {workflow.createdAt && (
              <p className="text-xs text-muted-foreground">
                Created: {new Date(workflow.createdAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default WorkflowList