"use client";

import { useRuns } from "@/app/automation/hooks/useRuns";
import RunCard from "./components/RunCard";

export default function RunsPage() {
  const { runs, isLoading } = useRuns();

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Execution Logs</h1>

      <div className="grid gap-4">
        {runs.map((run: any) => (
          <RunCard key={run.id} run={run} />
        ))}
      </div>
    </div>
  );
}
