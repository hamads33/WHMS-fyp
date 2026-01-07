/**
 * Workflows List Page - FIXED VERSION
 * ============================================================
 * Shows all workflows with manage options
 * 
 * Routes:
 *  GET  /admin/workflows              - List workflows
 *  POST /admin/workflows/:id/edit     - Edit workflow
 *  DELETE /admin/workflows/:id        - Delete workflow
 *  POST /admin/workflows/:id/run      - Execute workflow
 */

"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  Plus,
  Search,
  Loader2,
  Trash2,
  Play,
} from "lucide-react"
import { WorkflowList } from "@/components/automation/workflow-list"

// Toast Component
const Toast = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500"
  const icon = type === "success" ? "✓" : "!"

  return (
    <div className={`${bgColor} text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 fixed top-4 right-4 z-50`}>
      <span className="font-bold text-lg">{icon}</span>
      <span className="font-medium">{message}</span>
    </div>
  )
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState([])
  const [filteredWorkflows, setFilteredWorkflows] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const API_BASE = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/automation"
    : "http://localhost:4000/api/automation"

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows()
  }, [])

  // Filter workflows when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredWorkflows(workflows)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredWorkflows(
        workflows.filter(
          (w) =>
            w.name.toLowerCase().includes(term) ||
            w.description?.toLowerCase().includes(term)
        )
      )
    }
  }, [searchTerm, workflows])

  const loadWorkflows = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE}/workflows`)
      if (!response.ok) throw new Error("Failed to load workflows")
      
      const data = await response.json()
      const workflowsList = data.data || []
      setWorkflows(workflowsList)
      setFilteredWorkflows(workflowsList)
    } catch (err) {
      console.error("Error loading workflows:", err)
      setToast({ type: "error", message: "Failed to load workflows" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (workflow) => {
    // Route to workflow editor with workflow ID
    router.push(`/admin/workflows/${workflow.id}`)
  }

  const handleDelete = async (workflowId) => {
    try {
      setIsDeleting(true)
      const response = await fetch(`${API_BASE}/workflows/${workflowId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete workflow")

      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId))
      setDeleteConfirm(null)
      setToast({ type: "success", message: "Workflow deleted successfully" })
    } catch (err) {
      console.error("Error deleting workflow:", err)
      setToast({ type: "error", message: "Failed to delete workflow" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRun = async (workflowId) => {
    try {
      const response = await fetch(`${API_BASE}/workflows/${workflowId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {} }),
      })

      if (!response.ok) throw new Error("Failed to execute workflow")

      const data = await response.json()
      const runId = data.data?.runId || data.data?.id || "unknown"
      setToast({
        type: "success",
        message: `Workflow started! Run ID: ${runId}`,
      })
    } catch (err) {
      console.error("Error running workflow:", err)
      setToast({ type: "error", message: "Failed to execute workflow" })
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-gray-500 mt-1">
            Manage your automation workflows
          </p>
        </div>
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 outline-none"
          />
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500">Loading workflows...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && workflows.length === 0 && (
        <Alert className="bg-blue-50 border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            No workflows yet.{" "}
            <Link href="/admin/workflows/new" className="font-semibold hover:underline">
              Create one now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Workflows List */}
      {!isLoading && filteredWorkflows.length > 0 && (
        <div>
          {filteredWorkflows.length < workflows.length && (
            <p className="text-sm text-gray-500 mb-4">
              Showing {filteredWorkflows.length} of {workflows.length} workflows
            </p>
          )}
          <WorkflowList
            workflows={filteredWorkflows}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteConfirm(id)}
            onRun={handleRun}
          />
        </div>
      )}

      {/* No Results State */}
      {!isLoading && searchTerm && filteredWorkflows.length === 0 && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            No workflows match your search
          </AlertDescription>
        </Alert>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The workflow will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(deleteConfirm)}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}