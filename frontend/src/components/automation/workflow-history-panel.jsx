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
import {
  ChevronDown, ChevronRight, RefreshCcw, AlertCircle,
  CheckCircle2, XCircle, Clock, Loader2, Zap,
} from "lucide-react"

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const STATUS_CFG = {
  success:   { icon: CheckCircle2, cls: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500" },
  completed: { icon: CheckCircle2, cls: "bg-green-100 text-green-800 border-green-200",  dot: "bg-green-500" },
  failed:    { icon: XCircle,      cls: "bg-red-100 text-red-800 border-red-200",         dot: "bg-red-500"   },
  running:   { icon: Loader2,      cls: "bg-blue-100 text-blue-800 border-blue-200",      dot: "bg-blue-500"  },
  started:   { icon: Loader2,      cls: "bg-blue-100 text-blue-800 border-blue-200",      dot: "bg-blue-500"  },
  pending:   { icon: Clock,        cls: "bg-yellow-100 text-yellow-800 border-yellow-200",dot: "bg-yellow-400"},
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending
  return (
    <Badge variant="outline" className={`${cfg.cls} border font-medium capitalize text-xs`}>
      {status ?? "pending"}
    </Badge>
  )
}

function DurationPill({ startedAt, finishedAt, totalDuration }) {
  if (totalDuration) {
    const s = totalDuration / 1000
    return <span className="text-xs font-mono text-muted-foreground">{s < 1 ? `${totalDuration}ms` : `${s.toFixed(1)}s`}</span>
  }
  if (!startedAt || !finishedAt) return null
  const ms = new Date(finishedAt) - new Date(startedAt)
  return <span className="text-xs font-mono text-muted-foreground">{ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}</span>
}

const fmt = (d) => {
  if (!d) return "—"
  try { return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) }
  catch { return "—" }
}

const API_BASE = () =>
  (typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api/automation")
    : "http://localhost:4000/api/automation"
  ).replace(/\/$/, "")

/* -------------------------------------------------------
   Component
------------------------------------------------------- */

export function WorkflowHistoryPanel({ workflowId }) {
  const [runs, setRuns]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [total, setTotal]     = useState(0)
  const [expanded, setExpanded] = useState(null)

  const load = async () => {
    if (!workflowId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${API_BASE()}/workflows/${workflowId}/history?limit=50&offset=0`,
        { headers: { "Content-Type": "application/json" } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const data = json?.data ?? {}
      const items = Array.isArray(data) ? data : (data.runs ?? [])
      setRuns(items)
      setTotal(data.total ?? items.length)
    } catch (e) {
      setError(e.message || "Failed to load run history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [workflowId])

  /* render */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Run History</h2>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} execution${total !== 1 ? "s" : ""} recorded` : "No executions yet"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading history…</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="border-destructive">
          <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to Load History</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && runs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Zap className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No runs yet</p>
            <p className="text-sm text-muted-foreground">
              Use the <strong>Run</strong> button to execute this workflow for the first time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {!loading && !error && runs.length > 0 && (
        <div className="space-y-2">
          {runs.map((run) => {
            const cfg = STATUS_CFG[run.status] ?? STATUS_CFG.pending
            const isOpen = expanded === run.id
            return (
              <Collapsible key={run.id} open={isOpen} onOpenChange={() => setExpanded(isOpen ? null : run.id)}>
                <Card className={`border transition-colors hover:border-primary/30 ${isOpen ? "border-primary/40 shadow-sm" : ""}`}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full text-left">
                      <div className="px-4 py-3 flex items-center gap-3">
                        {/* Status dot */}
                        <span className={`flex-shrink-0 w-2 h-2 rounded-full ${cfg.dot}`} />

                        {/* Expand icon */}
                        {isOpen
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}

                        {/* Status badge */}
                        <StatusBadge status={run.status} />

                        {/* Trigger */}
                        <Badge variant="secondary" className="text-xs hidden sm:flex capitalize">
                          {run.triggeredBy ?? "manual"}
                        </Badge>

                        {/* Run ID */}
                        <span className="text-xs font-mono text-muted-foreground hidden md:block">
                          {String(run.id).slice(0, 8)}…
                        </span>

                        {/* Time */}
                        <span className="flex-1 text-sm text-muted-foreground text-left">
                          {fmt(run.startedAt ?? run.createdAt)}
                        </span>

                        {/* Duration */}
                        <DurationPill
                          startedAt={run.startedAt}
                          finishedAt={run.finishedAt}
                          totalDuration={run.totalDuration}
                        />

                        {/* Task counts */}
                        {(run.taskCount > 0 || run.successCount > 0) && (
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {run.successCount ?? 0}/{run.taskCount ?? 0} tasks
                          </span>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/10 px-4 py-4 space-y-3">
                      {/* Error */}
                      {run.errorMessage && (
                        <div className="rounded-md bg-red-50 border border-red-200 p-3">
                          <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
                          <p className="text-xs text-red-600 font-mono break-all">{run.errorMessage}</p>
                        </div>
                      )}

                      {/* Output */}
                      {run.output && Object.keys(run.output).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2">Output</p>
                          <pre className="text-xs bg-background border rounded p-3 overflow-x-auto max-h-48">
                            {JSON.stringify(run.output, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Input */}
                      {run.input && Object.keys(run.input).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2">Input</p>
                          <pre className="text-xs bg-background border rounded p-3 overflow-x-auto max-h-32">
                            {JSON.stringify(run.input, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Meta grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {[
                          ["Started", fmt(run.startedAt)],
                          ["Finished", fmt(run.finishedAt)],
                          ["Tasks", run.taskCount ?? "—"],
                          ["Trigger", run.triggeredBy ?? "manual"],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <span className="font-medium text-foreground">{label}</span>
                            <p className="text-muted-foreground mt-0.5">{val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Task runs */}
                      {run.taskRuns?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2">Task Results</p>
                          <div className="space-y-1.5">
                            {run.taskRuns.map((tr) => (
                              <div key={tr.id} className="flex items-center gap-2 text-xs rounded bg-background border px-3 py-2">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${(STATUS_CFG[tr.status] ?? STATUS_CFG.pending).dot}`} />
                                <span className="font-mono text-muted-foreground">{tr.taskId}</span>
                                <span className="flex-1 font-medium capitalize">{tr.status}</span>
                                {tr.errorMessage && <span className="text-red-500 truncate max-w-xs">{tr.errorMessage}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      )}
    </div>
  )
}
