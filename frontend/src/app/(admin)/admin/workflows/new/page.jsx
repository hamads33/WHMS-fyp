/**
 * Workflow Creation Page - STRICT API COMPLIANCE
 * ==================================================
 * Creates new workflows
 * 
 * Route: /admin/workflows/new
 * Copy to: app/(admin)/admin/workflows/new/page.jsx
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import WorkflowBuilder from "@/components/automation/workflow-builder"

export default function WorkflowNewPage() {
  const router = useRouter()
  const [error, setError] = useState(null)

  const handleBack = () => {
    router.push("/admin/workflows")
  }

  const handleWorkflowCreated = (workflowId) => {
    console.log('✅ Workflow created:', workflowId)
    // Navigate back to list
    router.push("/admin/workflows")
  }

  const handleError = (err) => {
    console.error('❌ Error:', err)
    setError(err?.message || "An error occurred")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </button>
          <h1 className="text-3xl font-bold">Create New Workflow</h1>
          <p className="text-muted-foreground mt-2">
            Define automation steps and create your workflow
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <Alert className="bg-red-50 border-red-300 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Workflow Builder */}
        <div>
          <WorkflowBuilder
            onWorkflowCreated={handleWorkflowCreated}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  )
}