"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
} from "lucide-react"

/* Route: app/(admin)/admin/workflows/page.jsx */

const WorkflowsPage = () => {
  const router = useRouter()
  const [workflows, setWorkflows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Load workflows
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/workflows`)
        const data = await response.json()
        setWorkflows(data.data || [])
      } catch (error) {
        console.error("Error loading workflows:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkflows()
  }, [])

  // Delete workflow
  const handleDeleteWorkflow = async () => {
    try {
      const response = await fetch(`/api/workflows/${deleteTarget.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete workflow")

      setWorkflows((prev) => prev.filter((w) => w.id !== deleteTarget.id))
      setShowDeleteDialog(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error("Error deleting workflow:", error)
      alert(`Error: ${error.message}`)
    }
  }

  // Toggle workflow status
  const handleToggleWorkflow = async (workflow) => {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !workflow.enabled }),
      })

      if (!response.ok) throw new Error("Failed to toggle workflow")

      const updated = await response.json()
      setWorkflows((prev) =>
        prev.map((w) => (w.id === workflow.id ? updated.data : w))
      )
    } catch (error) {
      console.error("Error toggling workflow:", error)
      alert(`Error: ${error.message}`)
    }
  }

  // Execute workflow
  const handleExecuteWorkflow = async (workflow) => {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!response.ok) throw new Error("Failed to execute workflow")

      alert("Workflow execution started")
    } catch (error) {
      console.error("Error executing workflow:", error)
      alert(`Error: ${error.message}`)
    }
  }

  // Clone workflow
  const handleCloneWorkflow = async (workflow) => {
    try {
      const newWorkflow = {
        ...workflow,
        id: undefined,
        name: `${workflow.name} (Copy)`,
      }

      const response = await fetch(`/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWorkflow),
      })

      if (!response.ok) throw new Error("Failed to clone workflow")

      const created = await response.json()
      setWorkflows((prev) => [...prev, created.data])
      router.push(`/admin/workflows/${created.data.id}`)
    } catch (error) {
      console.error("Error cloning workflow:", error)
      alert(`Error: ${error.message}`)
    }
  }

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <Link href="/admin/workflows/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0"
          />
        </div>
      </Card>

      {/* Workflows Table */}
      <Card>
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchQuery ? "No workflows found" : "No workflows yet"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell className="font-medium">{workflow.name}</TableCell>
                  <TableCell className="capitalize">{workflow.trigger}</TableCell>
                  <TableCell className="capitalize">{workflow.type}</TableCell>
                  <TableCell>
                    {workflow.definition?.tasks?.length || 0}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 rounded text-sm ${
                        workflow.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {workflow.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(workflow.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/workflows/${workflow.id}`}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExecuteWorkflow(workflow)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Execute
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleWorkflow(workflow)}
                        >
                          {workflow.enabled ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCloneWorkflow(workflow)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeleteTarget(workflow)
                            setShowDeleteDialog(true)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{deleteTarget?.name}"? This action
            cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkflow}
              className="bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default WorkflowsPage