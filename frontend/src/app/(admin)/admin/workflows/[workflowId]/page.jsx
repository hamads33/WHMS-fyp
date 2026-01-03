"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import WorkflowBuilder from "@/components/automation/workflow-builder"
import { ArrowLeft } from "lucide-react"

/* Route: app/(admin)/admin/workflows/[workflowId]/page.jsx */

export default function WorkflowDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = params.workflowId

  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* Load Workflow */
  useEffect(() => {
    let mounted = true

    async function loadWorkflow() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/workflows/${workflowId}`)
        if (!response.ok) throw new Error("Failed to load workflow")

        const data = await response.json()
        if (!mounted) return

        setWorkflow(data.data)
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Failed to load workflow")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (workflowId) {
      loadWorkflow()
    }

    return () => {
      mounted = false
    }
  }, [workflowId])

  /* Save Workflow */
  const handleSaveWorkflow = async (workflowData) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflowData),
      })

      if (!response.ok) throw new Error("Failed to save workflow")

      const updated = await response.json()
      setWorkflow(updated.data)
      alert("Workflow saved successfully")
    } catch (err) {
      console.error("Error saving workflow:", err)
      alert(err?.message || "Failed to save workflow")
    }
  }

  /* Render */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading workflow...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Link href="/admin/workflows">
            <Button variant="outline">Back to Workflows</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Workflow not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/admin/workflows"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </Link>
          <h1 className="text-3xl font-bold">{workflow.name}</h1>
          {workflow.description && (
            <p className="text-muted-foreground mt-1">
              {workflow.description}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Trigger: <span className="font-mono capitalize">{workflow.trigger}</span> | Type:{" "}
            <span className="font-mono capitalize">{workflow.type}</span>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <WorkflowBuilder
          defaultWorkflow={workflow}
          onSave={handleSaveWorkflow}
        />
      </div>
    </div>
  )
}