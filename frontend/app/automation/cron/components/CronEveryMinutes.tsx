// /frontend/app/automation/cron/components/CronEveryMinutes.tsx
"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export default function CronEveryMinutes({
  onApply,
}: {
  onApply: (v: number) => void;
}) {
  const [min, setMin] = useState(5);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <Label className="font-medium">Every X Minutes</Label>

      <div className="space-y-2">
        <Slider
          min={1}
          max={60}
          step={1}
          value={[min]}
          onValueChange={(v) => setMin(v[0])}
        />

        <Input
          type="number"
          className="w-28"
          value={min}
          onChange={(e) => setMin(Number(e.target.value))}
        />
      </div>

      <Button onClick={() => onApply(min)} className="w-full">
        Apply — Every {min} min
      </Button>
    </div>
  );
}
