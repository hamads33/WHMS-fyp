"use client";

import { useParams, useRouter } from "next/navigation";
import { useRunById } from "@/app/automation/hooks/useRunById";

import RunTimeline from "../components/RunTimeline";
import RunLogViewer from "../components/RunLogViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RunDetailPage() {
  const router = useRouter();
  const params = useParams();
  const runId = Number(params.runId);

  const { run, isLoading } = useRunById(runId);

  if (isLoading || !run) {
    return <div className="p-6">Loading run #{params.runId}...</div>;
  }

  return (
    <div className="p-6 space-y-6">

      {/* Back Button */}
      <Button 
        variant="ghost" 
        className="flex items-center gap-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {/* Run Header */}
      <h1 className="text-2xl font-semibold">
        Run #{run.id}
      </h1>

      <RunTimeline run={run} />

      {/* Pass ONLY the log to the viewer */}
      <RunLogViewer log={run.log} />

    </div>
  );
}
