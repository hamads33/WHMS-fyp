"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { ArrowLeft, Download, Loader2, AlertCircle, CheckCircle2, Zap } from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"
import { ConfirmDialog } from "@/components/automation/confirm-dialog"

const CATEGORY_COLORS = {
  billing: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-800" },
  auth: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800" },
  support: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-800" },
  services: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-800" },
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [installingId, setInstallingId] = useState(null)
  const [showConfirm, setShowConfirm] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      setLoading(true)
      setError(null)
      const data = await AutomationAPI.listTemplates()
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err.message || "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  async function handleInstall(template) {
    try {
      setInstallingId(template.id)
      const result = await AutomationAPI.installTemplate(template.id)
      setToast({ type: "success", message: `✅ ${template.name} installed!` })
      setTimeout(() => {
        router.push(`/admin/workflows/${result.workflow.id}`)
      }, 1000)
    } catch (err) {
      const msg = err.message || "Failed to install template"
      if (msg.includes("already installed")) {
        setToast({ type: "warning", message: "⚠️ This automation is already installed" })
      } else {
        setToast({ type: "error", message: `❌ ${msg}` })
      }
    } finally {
      setInstallingId(null)
      setShowConfirm(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/admin/automation" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold">Automation Templates</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/automation" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Automations
        </Link>
        <h1 className="text-3xl font-bold mb-2">Event-Driven Workflow Templates</h1>
        <p className="text-muted-foreground">
          Install ready-made event-driven workflows to handle common tasks across your system. Each template includes a trigger event, conditions, and actions. These will be created as workflows, not cron automation profiles.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4 ${
          toast.type === "success" ? "bg-green-500 text-white" :
          toast.type === "warning" ? "bg-amber-500 text-white" :
          "bg-destructive text-white"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => {
          const colors = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.support
          return (
            <Card key={template.id} className={`border-2 ${colors.border} overflow-hidden`}>
              <div className={colors.bg}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Badge className={colors.badge} variant="secondary">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
              </div>

              <CardContent className="space-y-4 py-4">
                {/* Trigger */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Trigger</p>
                  <Badge variant="outline" className="bg-background">
                    <Zap className="w-3 h-3 mr-1" />
                    {template.trigger.eventType}
                  </Badge>
                </div>

                {/* Actions preview */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Actions</p>
                  <div className="space-y-2">
                    {template.definition?.tasks?.slice(0, 3).map((task, i) => (
                      <div key={i} className="text-sm text-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="truncate">
                          {task.actionType || task.type === 'condition' ? 'Condition' : 'Action'}
                        </span>
                      </div>
                    ))}
                    {template.definition?.tasks?.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{template.definition.tasks.length - 3} more
                      </p>
                    )}
                  </div>
                </div>

                {/* Install button */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setShowConfirm(template)}
                    disabled={installingId === template.id}
                    className="flex-1"
                  >
                    {installingId === template.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Install
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!showConfirm}
        onOpenChange={(open) => !open && setShowConfirm(null)}
        title="Install Automation Template?"
        description={`This will create a new workflow "${showConfirm?.name}" with the trigger "${showConfirm?.trigger?.eventType}". You can customize it after installation.`}
        confirmLabel="Install"
        cancelLabel="Cancel"
        onConfirm={() => handleInstall(showConfirm)}
        variant="default"
      />
    </div>
  )
}
