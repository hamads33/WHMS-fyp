'use client'

import { AlertTriangle, AlertCircle, AlertOctagon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BroadcastBanner({ broadcasts = [], onDismiss }) {
  if (!broadcasts || broadcasts.length === 0) return null

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'WARNING':
        return 'bg-amber-50 border-amber-200 text-amber-800'
      case 'INFO':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="h-4 w-4 shrink-0 text-red-600" />
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
      case 'INFO':
      default:
        return <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
    }
  }

  return (
    <div className="space-y-2 px-4 py-2 md:px-6 md:py-3">
      {broadcasts.map((broadcast) => (
        <div
          key={broadcast.id}
          className={`flex items-center justify-between gap-4 rounded-lg border p-3 md:p-4 ${getSeverityStyles(
            broadcast.severity,
          )}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getSeverityIcon(broadcast.severity)}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{broadcast.title}</p>
              {broadcast.content && (
                <p className="text-xs opacity-90 mt-0.5">{broadcast.content}</p>
              )}
            </div>
          </div>
          {broadcast.isDismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(broadcast.id)}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
