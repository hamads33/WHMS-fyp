// /frontend/app/automation/cron/components/CronPreview.tsx
"use client";

import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export default function CronPreview({
  cron,
  pretty,
  interval,
  nextRuns,
  error,
}: {
  cron: string;
  pretty: string;
  interval: number | null;
  nextRuns?: string[];
  error?: string | null;
}) {
  return (
    <div className="space-y-4 mt-4">

      {/* Cron Summary */}
      <div className="p-4 border rounded-lg bg-slate-50">
        <div className="text-xs uppercase text-slate-500">Generated CRON</div>
        <div className="font-mono text-lg font-semibold mt-1">{cron}</div>

        <div className="flex items-center gap-3 mt-2">
          {pretty && <Badge variant="secondary">{pretty}</Badge>}

          {interval !== null && (
            <Badge className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {interval}s interval
            </Badge>
          )}
        </div>
      </div>

      {/* Errors */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Invalid Cron Expression</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Next Runs */}
      {!error && nextRuns && nextRuns.length > 0 && (
        <div className="p-4 border rounded-lg bg-white">
          <div className="text-sm font-medium mb-2">Next 5 Runs:</div>
          <ul className="list-disc ml-6 text-sm space-y-1">
            {nextRuns.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
