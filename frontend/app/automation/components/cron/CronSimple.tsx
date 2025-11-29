"use client";

import React from "react";
import { ParsedCron, buildCronFromParsed } from "@/app/automation/lib/cron-utils";

export default function CronSimple({ value, onChange }:{ value: string; onChange: (c:string)=>void }) {
  // Provide a few common presets
  const presets: { label: string; parsed: ParsedCron }[] = [
    { label: "Every 5 minutes", parsed: { mode: "every_x_minutes", minutes: 5 } },
    { label: "Every 15 minutes", parsed: { mode: "every_x_minutes", minutes: 15 } },
    { label: "Hourly", parsed: { mode: "hourly", hours: 1 } },
    { label: "Daily (midnight)", parsed: { mode: "daily" } },
    { label: "Weekly (Sunday midnight)", parsed: { mode: "weekly", dayOfWeek: 0 } },
    { label: "Monthly (1st)", parsed: { mode: "monthly", dayOfMonth: 1 } },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="px-3 py-1 rounded border text-sm hover:bg-slate-50"
            onClick={() => onChange(buildCronFromParsed(p.parsed))}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">Current cron: <code>{value}</code></div>
    </div>
  );
}
