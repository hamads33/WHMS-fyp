// /frontend/app/automation/cron/components/CronModeCards.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const modes = [
  {
    id: "everySeconds",
    title: "Every X Seconds",
    desc: "Run the task every N seconds. Ideal for quick tests.",
  },
  {
    id: "everyMinutes",
    title: "Every X Minutes",
    desc: "The most common option. Perfect for periodic tasks.",
  },
  {
    id: "everyHours",
    title: "Every X Hours",
    desc: "Runs at a specific minute every hour cycle.",
  },
  {
    id: "daily",
    title: "Daily",
    desc: "Run once every day at a specific time.",
  },
  {
    id: "weekly",
    title: "Weekly",
    desc: "Run once per week on a chosen weekday + time.",
  },
  {
    id: "monthly",
    title: "Monthly",
    desc: "Run once per month on a chosen day + time.",
  },
];

export default function CronModeCards({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (m: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {modes.map((m) => (
        <Card
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={cn(
            "cursor-pointer border-2 transition-all hover:shadow-md",
            selected === m.id ? "border-sky-500 shadow-lg" : "border-transparent"
          )}
        >
          <CardHeader>
            <CardTitle>{m.title}</CardTitle>
            <CardDescription>{m.desc}</CardDescription>
          </CardHeader>
          <CardContent></CardContent>
        </Card>
      ))}
    </div>
  );
}
