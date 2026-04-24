"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, RefreshCcw, AlertCircle, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"

/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */

const statusConfig = {
  success: {
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 border-green-200",
    iconClass: "text-green-600",
  },
  failed: {
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200",
    iconClass: "text-red-600",
  },
  running: {
    icon: Loader2,
    className: "bg-blue-100 text-blue-800 border-blue-200",
    iconClass: "text-blue-600 animate-spin",
  },
  pending: {
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    iconClass: "text-yellow-600",
  },
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] ?? statusConfig.pending
  return (
    <Badge variant="outline" className={`${cfg.className} border font-medium capitalize`}>
      {status ?? "pending"}
    </Badge>
  )
}

function DurationLabel({ startedAt, finishedAt }) {
  if (!startedAt) return null
  if (!finishedAt) return <span className="text-xs text-muted-foreground">running…</span>

  const ms = new Date(finishedAt) - new Date(startedAt)
  const label = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  return <span className="text-xs text-muted-foreground font-mono">{label}</span>
}

const formatTime = (date) => {
  if (!date) return "—"
  try {
    return new Date(date).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
  } catch {
    return "Invalid date"
  }
}

/* -----------------------------------------------------
   Component
----------------------------------------------------- */

export function ExecutionLogPanel({ profileId }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [total, setTotal] = useState(0)

  const loadRuns = async () => {
    if (!profileId) {
      setError("No profile ID provided")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await AutomationAPI.listProfileRuns(profileId, { limit: 50, offset: 0 })
      const data = res?.data ?? {}
      const items = Array.isArray(data) ? data : (data.runs ?? [])
      setRuns(items)
      setTotal(data.total ?? items.length)
    } catch (err) {
      setError(err?.message || "Failed to load execution history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRuns()
  }, [profileId])

  /* Render */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Execution History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total} run${total !== 1 ? "s" : ""} recorded` : "No executions yet"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRuns} disabled={loading} className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading execution history…</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="border-destructive">
          <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive mb-1">Failed to Load History</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadRuns}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && runs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Runs Yet</h3>
            <p className="text-sm text-muted-foreground">
              Use the <strong>Run Profile</strong> button to trigger the first execution.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Run list */}
      {!loading && !error && runs.length > 0 && (
        <div className="space-y-2">
          {runs.map((run) => (
            <Collapsible
              key={run.id}
              open={expandedId === run.id}
              onOpenChange={() => setExpandedId(expandedId === run.id ? null : run.id)}
            >
              <Card className="border hover:border-primary/40 transition-colors">
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left">
                    <div className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      {/* Expand icon */}
                      <div className="flex-shrink-0">
                        {expandedId === run.id
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>

                      {/* Status badge */}
                      <StatusBadge status={run.status} />

                      {/* Run ID */}
                      <span className="text-xs font-mono text-muted-foreground hidden sm:block">
                        #{String(run.id).slice(0, 8)}…
                      </span>

                      {/* Timestamps */}
                      <div className="flex-1 text-sm text-muted-foreground">
                        {formatTime(run.startedAt ?? run.createdAt)}
                      </div>

                      {/* Duration */}
                      <DurationLabel startedAt={run.startedAt} finishedAt={run.finishedAt} />

                      {/* Triggered by */}
                      <Badge variant="secondary" className="text-xs hidden sm:flex">
                        {run.triggeredBy ?? "manual"}
                      </Badge>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t bg-muted/10 space-y-3 pt-4">
                    {/* Error message */}
                    {run.errorMessage && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3">
                        <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
                        <p className="text-xs text-red-600 font-mono break-all">{run.errorMessage}</p>
                      </div>
                    )}

                    {/* Result / output */}
                    {run.result && (
                      <div>
                        <p className="text-xs font-semibold mb-2">Result</p>
                        <pre className="text-xs bg-background border rounded p-3 overflow-x-auto">
                          {JSON.stringify(run.result, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div><span className="font-medium text-foreground">Started:</span><br />{formatTime(run.startedAt)}</div>
                      <div><span className="font-medium text-foreground">Finished:</span><br />{formatTime(run.finishedAt)}</div>
                      <div><span className="font-medium text-foreground">Task ID:</span><br />{run.taskId ?? "—"}</div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  )
}
