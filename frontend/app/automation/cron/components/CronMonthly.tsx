// /frontend/app/automation/cron/components/CronMonthly.tsx
"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CronMonthly({
  onApply,
}: {
  onApply: (data: { day: number; hour: number; minute: number }) => void;
}) {
  const [day, setDay] = useState(1);
  const [time, setTime] = useState("00:00");

  const parseTime = () => {
    const [h, m] = time.split(":").map(Number);
    return { hour: h, minute: m };
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <Label className="font-medium">Monthly Schedule</Label>

      <div className="space-y-2">
        <Label>Day of Month</Label>
        <Input
          type="number"
          min={1}
          max={31}
          className="w-28"
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        />
      </div>

      <div className="space-y-2">
        <Label>Time</Label>
        <Input
          type="time"
          className="w-40"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <Button
        className="w-full"
        onClick={() => onApply({ day, ...parseTime() })}
      >
        Apply — Day {day} at {time}
      </Button>
    </div>
  );
}
