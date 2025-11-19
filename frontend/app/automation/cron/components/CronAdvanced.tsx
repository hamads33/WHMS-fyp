// /frontend/app/automation/cron/components/CronAdvanced.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CronAdvanced({
  expression,
  onChange,
}: {
  expression: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Cron Expression (Advanced)</Label>

      <Input
        placeholder="*/5 * * * * *"
        value={expression}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono"
      />

      <p className="text-xs text-slate-500">
        Supports both 5-field and 6-field cron formats.  
        5-field will automatically convert to 6-field by prefixing seconds.
      </p>
    </div>
  );
}
