// /frontend/app/automation/cron/components/CronEverySeconds.tsx
"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export default function CronEverySeconds({
  onApply,
}: {
  onApply: (v: number) => void;
}) {
  const [sec, setSec] = useState(5);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <Label className="font-medium">Every X Seconds</Label>

      <div className="space-y-2">
        <Slider
          min={1}
          max={60}
          step={1}
          value={[sec]}
          onValueChange={(v) => setSec(v[0])}
        />
        <Input
          type="number"
          className="w-28"
          value={sec}
          onChange={(e) => setSec(Number(e.target.value))}
        />
      </div>

      <Button onClick={() => onApply(sec)} className="w-full">
        Apply — Every {sec} sec
      </Button>
    </div>
  );
}
