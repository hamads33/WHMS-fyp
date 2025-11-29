// frontend/app/automation/components/cron/cron-builder.tsx
"use client";

import React, { useEffect, useState } from "react";
import CronSimple from "./CronSimple";
import CronAdvanced from "./CronAdvanced";
import CronPreview from "./CronPreview";
import { parseCronExpression, buildCronFromParsed, ParsedCron } from "@/app/automation/lib/cron-utils";

export default function CronBuilder({ initialCron, onChange }: { initialCron?: string; onChange: (c: string) => void }) {
  const [mode, setMode] = useState<"preset"|"advanced"|"manual">("preset");
  const [cron, setCron] = useState(initialCron ?? "*/5 * * * *");

  useEffect(() => {
    if (initialCron) {
      const parsed = parseCronExpression(initialCron);
      if (parsed.mode === "manual") { setMode("manual"); setCron(parsed.expr); }
      else {
        const built = buildCronFromParsed(parsed as ParsedCron);
        setCron(built);
        setMode(parsed.mode === "custom" ? "advanced" : "preset");
      }
    }
  }, [initialCron]);

  function update(c: string) { setCron(c); onChange(c); }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">Mode</label>
        <select className="border rounded p-1" value={mode} onChange={(e)=>setMode(e.target.value as any)}>
          <option value="preset">Preset</option>
          <option value="advanced">Advanced</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {mode === "preset" && <CronSimple value={cron} onChange={update} />}
      {mode === "advanced" && <CronAdvanced value={cron} onChange={update} />}
      {mode === "manual" && <div>
        <label className="text-sm">Manual cron</label>
        <input className="w-full border rounded p-2" value={cron} onChange={e=>update(e.target.value)} />
      </div>}

      <CronPreview value={cron}/>
    </div>
  );
}
