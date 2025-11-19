// /frontend/app/automation/cron/components/CronDaily.tsx
"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CronDaily({
  onApply,
}: {
  onApply: (data: { hour: number; minute: number }) => void;
}) {
  const [time, setTime] = useState("00:00");

  const parseTime = () => {
    const [h, m] = time.split(":").map(Number);
    return { hour: h, minute: m };
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <Label className="font-medium">Daily at Specific Time</Label>

      <Input
        type="time"
        className="w-40"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />

      <Button onClick={() => onApply(parseTime())} className="w-full">
        Apply — Daily at {time}
      </Button>
    </div>
  );
}
