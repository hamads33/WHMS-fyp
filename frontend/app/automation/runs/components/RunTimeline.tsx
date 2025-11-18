"use client";

export default function RunTimeline({ run }: any) {
  return (
    <div className="border rounded p-4 space-y-4 bg-card">
      <h3 className="font-semibold">Execution Timeline</h3>

      <div className="space-y-2 text-sm">
        <div>Attempt: {run.attempt}</div>
        <div>Status: {run.status}</div>
        <div>Started: {new Date(run.startedAt).toLocaleString()}</div>
        {run.finishedAt && (
          <div>Finished: {new Date(run.finishedAt).toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}
