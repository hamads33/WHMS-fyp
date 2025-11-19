// /frontend/app/automation/cron/components/CronWeekly.tsx
"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const weekdays = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

export default function CronWeekly({
  onApply,
}: {
  onApply: (data: { dayOfWeek: number; hour: number; minute: number }) => void;
}) {
  const [day, setDay] = useState("1");
  const [time, setTime] = useState("00:00");

  const parseTime = () => {
    const [h, m] = time.split(":").map(Number);
    return { hour: h, minute: m };
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <Label className="font-medium">Weekly Schedule</Label>

      <div className="space-y-2">
        <Label>Day of Week</Label>
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
          <SelectContent>
            {weekdays.map((w) => (
              <SelectItem key={w.value} value={String(w.value)}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        onClick={() => onApply({ dayOfWeek: Number(day), ...parseTime() })}
      >
        Apply — {weekdays.find((w) => w.value === Number(day))?.label} at {time}
      </Button>
    </div>
  );
}
