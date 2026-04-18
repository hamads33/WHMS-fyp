// ============================================================================
// FILE: components/backup-logs-viewer.jsx
// PURPOSE: Real-time backup logs with progress tracking
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBackupLogs } from "@/lib/hooks/useBackups";
import { formatDuration, getStatusColor, getStatusIcon } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

export function BackupLogsViewer({ backupId }) {
  const { logs, status, loading } = useBackupLogs(backupId);
  const [hideFailed, setHideFailed] = useState(true);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      {status && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Backup Progress</CardTitle>
                <CardDescription>
                  Current step: {status.currentStep}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(status.status)}>
                {getStatusIcon(status.status)} {status.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="h-2" />
            </div>

            {status.estimatedTimeRemaining && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Estimated time remaining:{" "}
                  {formatDuration(status.estimatedTimeRemaining)}
                </span>
              </div>
            )}

            {status.errorMessage && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
                {status.errorMessage}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>
                Detailed step-by-step execution timeline
              </CardDescription>
            </div>
            <button
              onClick={() => setHideFailed(!hideFailed)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                hideFailed
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {hideFailed ? '✓ Hide Failed' : 'Show All'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No logs available yet
                </div>
              ) : (
                (() => {
                  const filteredLogs = hideFailed
                    ? logs.filter(log => log.status !== 'failed' && log.status !== 'error')
                    : logs;

                  return filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No successful logs to display
                    </div>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <LogEntry
                        key={log.id}
                        log={log}
                        isLast={index === filteredLogs.length - 1}
                      />
                    ))
                  );
                })()
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function LogEntry({ log, isLast }) {
  const isSuccess = log.status === "success";
  const isFailed = log.status === "failed" || log.status === "error";
  const isRunning = log.status === "running" || log.status === "started";

  const Icon = isSuccess
    ? CheckCircle2
    : isFailed
    ? XCircle
    : isRunning
    ? Loader2
    : Clock;

  const iconColor = isSuccess
    ? "text-green-600 bg-green-100 dark:bg-green-900/20"
    : isFailed
    ? "text-red-600 bg-red-100 dark:bg-red-900/20"
    : "text-blue-600 bg-blue-100 dark:bg-blue-900/20";

  return (
    <div className="relative">
      <div className="flex gap-4">
        {/* Timeline Icon */}
        <div className="flex flex-col items-center">
          <div className={`p-2 rounded-full ${iconColor}`}>
            <Icon
              className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`}
            />
          </div>
          {!isLast && (
            <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {log.step.replace(/_/g, " ").toUpperCase()}
            </span>
            <Badge variant="outline" className="text-xs">
              {log.status}
            </Badge>
          </div>

          {log.message && (
            <p className="text-sm text-muted-foreground mb-2">
              {log.message}
            </p>
          )}

          {log.meta && Object.keys(log.meta).length > 0 && (
            <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 rounded p-2 font-mono">
              {JSON.stringify(log.meta, null, 2)}
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-2">
            {new Date(log.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}