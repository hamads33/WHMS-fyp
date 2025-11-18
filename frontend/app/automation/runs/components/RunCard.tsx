"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";

export interface Run {
  id: number;
  taskId: number;
  status: "queued" | "running" | "success" | "failed";
  startedAt: string;
  finishedAt?: string | null;
  attempt: number;
}

export default function RunCard({ run }: { run: Run }) {
  const started = new Date(run.startedAt);
  const finished = run.finishedAt ? new Date(run.finishedAt) : null;

  const duration =
    finished && started
      ? ((finished.getTime() - started.getTime()) / 1000).toFixed(2)
      : null;

  return (
    <Link href={`/automation/runs/${run.id}`}>
      <Card className="hover:shadow-lg hover:border-primary transition cursor-pointer rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center text-base">
            <span className="font-semibold">Run #{run.id}</span>

            <StatusBadge status={run.status} />
          </CardTitle>
        </CardHeader>

        <CardContent className="text-sm space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span className="font-medium">Task ID:</span>
            <span>{run.taskId}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Started:</span>
            <span>{started.toLocaleString()}</span>
          </div>

          {finished && (
            <div className="flex justify-between">
              <span className="font-medium">Finished:</span>
              <span>{finished.toLocaleString()}</span>
            </div>
          )}

          {duration && (
            <div className="flex justify-between">
              <span className="font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration:
              </span>
              <span>{duration}s</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="font-medium">Attempt:</span>
            <span>{run.attempt}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* -----------------------------
   STATUS BADGE COMPONENT
-------------------------------- */
function StatusBadge({ status }: { status: Run["status"] }) {
  switch (status) {
    case "success":
      return (
        <Badge
          variant="default"
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
        >
          <CheckCircle className="w-4 h-4" />
          success
        </Badge>
      );

    case "failed":
      return (
        <Badge
          variant="destructive"
          className="flex items-center gap-1"
        >
          <XCircle className="w-4 h-4" />
          failed
        </Badge>
      );

    case "running":
      return (
        <Badge
          variant="secondary"
          className="flex items-center gap-1"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          running
        </Badge>
      );

    default:
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          queued
        </Badge>
      );
  }
}
