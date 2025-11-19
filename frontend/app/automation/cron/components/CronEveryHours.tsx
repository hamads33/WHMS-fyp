// /frontend/app/automation/cron/components/CronEveryHours.tsx
"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export default function CronEveryHours({
  onApply,
}: {
  onApply: (data: { value: number; minute: number }) => void;
}) {
  const [hours, setHours] = useState(1);
  const [minute, setMinute] = useState(0);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <Label className="font-medium">Every X Hours</Label>

      {/* Hours Slider */}
      <div className="space-y-2">
        <Label>Hours Interval</Label>
        <Slider
          min={1}
          max={24}
          step={1}
          value={[hours]}
          onValueChange={(v) => setHours(v[0])}
        />
        <Input
          type="number"
          className="w-28"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        />
      </div>

      {/* Minute picker */}
      <div className="space-y-2">
        <Label>At Minute</Label>
        <Input
          type="number"
          className="w-28"
          min={0}
          max={59}
          value={minute}
          onChange={(e) => setMinute(Number(e.target.value))}
        />
      </div>

      <Button
        onClick={() => onApply({ value: hours, minute })}
        className="w-full"
      >
        Apply — Every {hours} hour(s) at :{minute.toString().padStart(2, "0")}
      </Button>
    </div>
  );
}
