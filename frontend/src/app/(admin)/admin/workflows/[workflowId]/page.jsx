"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Settings2, History } from "lucide-react"
import WorkflowBuilder from "@/components/automation/workflow-builder"
import { WorkflowHistoryPanel } from "@/components/automation/workflow-history-panel"

export default function WorkflowEditPage() {
  const router  = useRouter()
  const params  = useParams()
  const workflowId = params?.workflowId

  const handleError = (err) => {
    console.error("Workflow error:", err?.message)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/admin/workflows"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Edit Workflow</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Modify tasks, configure triggers, and view execution history
          </p>
        </div>
      </div>

      {/* Tabbed content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="builder">
          <TabsList className="mb-6 h-10">
            <TabsTrigger value="builder" className="gap-2 px-4">
              <Settings2 className="w-4 h-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 px-4">
              <History className="w-4 h-4" />
              Run History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <WorkflowBuilder onError={handleError} />
          </TabsContent>

          <TabsContent value="history">
            <WorkflowHistoryPanel workflowId={workflowId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
