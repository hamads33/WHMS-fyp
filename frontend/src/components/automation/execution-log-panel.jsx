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
import { ChevronDown, ChevronRight, RefreshCcw, AlertCircle } from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"

/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */

const levelBadge = (level) => {
  const styles = {
    INFO: "bg-blue-100 text-blue-800 border-blue-200",
    WARN: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ERROR: "bg-red-100 text-red-800 border-red-200",
    SUCCESS: "bg-green-100 text-green-800 border-green-200",
  }

  return styles[level] || "bg-gray-100 text-gray-800 border-gray-200"
}

const formatTime = (date) => {
  if (!date) return "—"
  
  try {
    return new Date(date).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return "Invalid date"
  }
}

/* -----------------------------------------------------
   Component
----------------------------------------------------- */

export function ExecutionLogPanel({ profileId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const loadLogs = async () => {
    if (!profileId) {
      setError("No profile ID provided")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await AutomationAPI.listProfileAuditLogs(profileId, {
        limit: 50,
        offset: 0,
      })

      const normalized = (res.data || []).map((log) => ({
        id: log.id,
        action: log.action || "unknown",
        level: log.level || "INFO",
        actor: log.actor || "system",
        createdAt: log.createdAt,
        meta: log.meta || {},
      }))

      setLogs(normalized)
    } catch (err) {
      setError(err?.message || "Failed to load execution logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [profileId])

  /* -----------------------------------------------------
     Render
  ----------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Execution History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only audit trail of all automation executions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadLogs}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-muted-foreground">
                Loading execution logs...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {!loading && error && (
        <Card className="border-destructive">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive mb-1">
                  Failed to Load Logs
                </h3>
                <p className="text-sm text-muted-foreground">
                  {error}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadLogs}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && logs.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <RefreshCcw className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No Execution History</h3>
              <p className="text-sm text-muted-foreground">
                No execution activity has been recorded for this profile yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs List */}
      {!loading && !error && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => (
            <Collapsible
              key={log.id}
              open={expandedId === log.id}
              onOpenChange={() =>
                setExpandedId(expandedId === log.id ? null : log.id)
              }
            >
              <Card className="border-2 hover:border-primary/30 transition-colors">
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left">
                    <div className="p-4 flex items-start gap-4 hover:bg-muted/40 transition-colors">
                      <div className="flex-shrink-0 pt-0.5">
                        {expandedId === log.id ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2 flex-wrap">
                          <Badge 
                            variant="outline"
                            className={`${levelBadge(log.level)} border font-medium`}
                          >
                            {log.level}
                          </Badge>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {log.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{log.id}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium">Actor:</span> {log.actor}
                          </p>
                          <p>
                            <span className="font-medium">Time:</span> {formatTime(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t bg-muted/20">
                    <div className="pt-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span>Audit Metadata</span>
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(log.meta).length} fields
                        </Badge>
                      </h4>
                      
                      <div className="rounded-lg bg-background border p-4 overflow-hidden">
                        <pre className="text-xs overflow-x-auto">
{JSON.stringify(log.meta, null, 2)}
                        </pre>
                      </div>
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