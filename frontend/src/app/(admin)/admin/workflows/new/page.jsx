"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"

import WorkflowBuilder from "@/components/automation/workflow-builder"
import { ArrowLeft } from "lucide-react"

/* Route: app/(admin)/admin/workflows/new/page.jsx */

export default function CreateWorkflowPage() {
  const router = useRouter()

  /* Save Workflow */
  const handleSaveWorkflow = async (workflowData) => {
    try {
      const response = await fetch(`/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflowData),
      })

      if (!response.ok) throw new Error("Failed to create workflow")

      const created = await response.json()
      alert("Workflow created successfully")
      router.push(`/admin/workflows/${created.data.id}`)
    } catch (err) {
      console.error("Error creating workflow:", err)
      alert(err?.message || "Failed to create workflow")
    }
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
          <h1 className="text-3xl font-bold">Create New Workflow</h1>
          <p className="text-muted-foreground mt-2">
            Build a new workflow with tasks and triggers
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <WorkflowBuilder onSave={handleSaveWorkflow} />
      </div>
    </div>
  )
}