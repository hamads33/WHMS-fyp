"use client";

import React from "react";
import { useTaskHistory, useRunTask } from "@/app/automation/hooks/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function TaskRunHistory({ taskId }: { taskId?: string }) {
  if (!taskId) return null;

  // TypeScript fix: ensure strict string
  const safeTaskId = taskId as string;

  const { data = [], isLoading } = useTaskHistory(safeTaskId);
  const runMut = useRunTask();

  async function handleRun() {
    toast.promise(runMut.mutateAsync(safeTaskId), {
      loading: "Running task...",
      success: "Task triggered",
      error: "Failed to run task",
    });
  }


  // Map backend → shadcn badge variants
  function statusToVariant(status: string | undefined): 
    "default" | "secondary" | "destructive" | "outline" {
    if (!status) return "outline";

    switch (status) {
      case "success":
        return "secondary"; // shadcn has no "success"
      case "running":
        return "default"; // blue-ish neutral
      case "failed":
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  }

  return (
    <div className="border rounded p-3 bg-white">
      <div className="flex justify-between items-center mb-3">
        <div className="font-medium">Run History</div>
        <Button onClick={handleRun}>Run now</Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading history...</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-gray-500">No runs yet.</div>
      ) : (
        <div className="space-y-2">
          {data.map((h: any) => (
            <div
              key={h.id ?? h.timestamp}
              className="p-2 border rounded bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {new Date(h.timestamp || h.createdAt).toLocaleString()}
                </div>

                <Badge variant={statusToVariant(h.status)}>
                  {h.status ?? "unknown"}
                </Badge>
              </div>

              {h.durationMs && (
                <div className="text-xs text-gray-500 mt-1">
                  Duration: {h.durationMs} ms
                </div>
              )}

              {h.output && (
                <pre className="text-xs mt-2 whitespace-pre-wrap max-h-36 overflow-auto">
                  {JSON.stringify(h.output, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
