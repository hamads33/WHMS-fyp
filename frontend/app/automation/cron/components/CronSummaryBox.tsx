// /frontend/app/automation/cron/components/CronSummaryBox.tsx
"use client";

import React from "react";

export default function CronSummaryBox({
  title,
  description,
  cron,
}: {
  title: string;
  description?: string;
  cron: string;
}) {
  return (
    <div className="border rounded-lg p-4 bg-slate-50">
      <h4 className="font-semibold">{title}</h4>
      {description && (
        <p className="text-sm text-slate-500 mb-2">{description}</p>
      )}

      <div className="font-mono text-sm bg-white p-2 rounded-md border">
        {cron}
      </div>
    </div>
  );
}
