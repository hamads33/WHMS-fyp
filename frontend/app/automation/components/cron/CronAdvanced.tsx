"use client";

import React, { useState, useEffect } from "react";
import { parseCronExpression, buildCronFromParsed, ParsedCron } from "@/app/automation/lib/cron-utils";

export default function CronAdvanced({ value, onChange }:{ value:string; onChange:(c:string)=>void }) {
  const parsed = parseCronExpression(value);
  const [fields, setFields] = useState<string[]>(() => {
    if (parsed.mode === "custom") return [...parsed.fields];
    if (parsed.mode === "manual") return (parsed.expr || "* * * * *").split(/\s+/);
    return value.split(/\s+/);
  });

  useEffect(()=> {
    const expr = fields.join(" ");
    onChange(expr);
  }, [fields.join("|")]); // intentionally use join to trigger

  function update(idx:number, v:string) {
    const next = [...fields];
    next[idx] = v;
    setFields(next);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        <div>
          <label className="text-xs font-medium">Minute</label>
          <input className="w-full border rounded p-2 text-sm" value={fields[0]} onChange={(e)=>update(0,e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium">Hour</label>
          <input className="w-full border rounded p-2 text-sm" value={fields[1]} onChange={(e)=>update(1,e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium">Day</label>
          <input className="w-full border rounded p-2 text-sm" value={fields[2]} onChange={(e)=>update(2,e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium">Month</label>
          <input className="w-full border rounded p-2 text-sm" value={fields[3]} onChange={(e)=>update(3,e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium">Weekday</label>
          <input className="w-full border rounded p-2 text-sm" value={fields[4]} onChange={(e)=>update(4,e.target.value)} />
        </div>
      </div>

      <div className="text-xs text-gray-500">Output cron: <code>{fields.join(" ")}</code></div>

      <div className="flex gap-2">
        <button type="button" className="px-3 py-1 bg-slate-100 rounded" onClick={() => onChange(buildCronFromParsed(parsed as ParsedCron))}>
          Apply
        </button>
      </div>
    </div>
  );
}
