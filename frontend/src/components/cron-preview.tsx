"use client"

import { useMemo } from "react"
import cronstrue from "cronstrue"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Timer } from "lucide-react"
import type { CronValidationResult } from "../../lib/cron-utils"
import { getNextRuns } from "../../lib/cron-utils"

interface CronPreviewProps {
  cron: string
  validation: CronValidationResult
}

export function CronPreview({ cron, validation }: CronPreviewProps) {
  const humanReadable = useMemo(() => {
    if (!validation.valid || !cron.trim()) {
      return null
    }
    try {
      return cronstrue.toString(cron, {
        throwExceptionOnParseError: false,
        use24HourTimeFormat: true,
      })
    } catch {
      return null
    }
  }, [cron, validation.valid])

  const nextRuns = useMemo(() => {
    if (!validation.valid) return []
    return getNextRuns(cron, 3)
  }, [cron, validation.valid])

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4" />
          Schedule Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generated Cron Expression */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">Cron:</span>
          <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">{cron || "—"}</code>
        </div>

        {/* Human Readable Description */}
        {humanReadable && (
          <div className="flex items-start gap-3">
            <span className="text-sm text-muted-foreground shrink-0 pt-0.5">Runs:</span>
            <p className="text-sm font-medium text-foreground">{humanReadable}</p>
          </div>
        )}

        {/* Next Run Times */}
        {nextRuns.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Next executions:</span>
            <div className="flex flex-wrap gap-2">
              {nextRuns.map((date, index) => (
                <Badge key={index} variant="secondary" className="gap-1.5 font-normal">
                  <Clock className="h-3 w-3" />
                  {date.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!validation.valid && (
          <p className="text-sm text-muted-foreground italic">Enter a valid cron expression to see preview</p>
        )}
      </CardContent>
    </Card>
  )
}
