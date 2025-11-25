"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import cronstrue from "cronstrue";

interface CronBuilderProps {
  value: string;
  onChange: (cron: string) => void;
}

const FREQUENCIES = [
  { label: "Every X minutes", value: "minutes" },
  { label: "Every X hours", value: "hours" },
  { label: "Daily at a specific time", value: "daily" },
  { label: "Weekly (day + time)", value: "weekly" },
  { label: "Monthly (date + time)", value: "monthly" },
  { label: "Custom (manual cron)", value: "custom" },
];

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [frequency, setFrequency] = useState("minutes");
  const [minuteStep, setMinuteStep] = useState(5);
  const [hourStep, setHourStep] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState("00:00");
  const [weekday, setWeekday] = useState("MON");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [customCron, setCustomCron] = useState(value ?? "*/5 * * * *");

  // Auto-select frequency if cron matches a known pattern
  useEffect(() => {
    if (!value) return;

    if (value.startsWith("*/") && value.endsWith("* * * *")) {
      setFrequency("minutes");
      setMinuteStep(Number(value.split("*/")[1].split(" ")[0]));
      return;
    }

    if (value.includes("0 */")) {
      setFrequency("hours");
      setHourStep(Number(value.split("*/")[1].split(" ")[0]));
      return;
    }

    if (/^\d+ \d+ \* \* \*$/.test(value)) {
      setFrequency("daily");
      const [m, h] = value.split(" ");
      setTimeOfDay(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`);
      return;
    }

    if (value.match(/^\d+ \d+ \* \* [A-Z]{3}$/)) {
      setFrequency("weekly");
      const [m, h, , , d] = value.split(" ");
      setWeekday(d);
      setTimeOfDay(`${h}:${m}`);
      return;
    }

    if (/^\d+ \d+ \d+ \* \*$/.test(value)) {
      setFrequency("monthly");
      const [m, h, day] = value.split(" ");
      setDayOfMonth(Number(day));
      setTimeOfDay(`${h}:${m}`);
      return;
    }

    setFrequency("custom");
    setCustomCron(value);
  }, [value]);

  function buildCron() {
    switch (frequency) {
      case "minutes":
        return `*/${minuteStep} * * * *`;

      case "hours":
        return `0 */${hourStep} * * *`;

      case "daily": {
        const [h, m] = timeOfDay.split(":");
        return `${m} ${h} * * *`;
      }

      case "weekly": {
        const [h, m] = timeOfDay.split(":");
        return `${m} ${h} * * ${weekday}`;
      }

      case "monthly": {
        const [h, m] = timeOfDay.split(":");
        return `${m} ${h} ${dayOfMonth} * *`;
      }

      case "custom":
        return customCron;

      default:
        return "*/5 * * * *";
    }
  }

  useEffect(() => {
    onChange(buildCron());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, minuteStep, hourStep, weekday, timeOfDay, dayOfMonth, customCron]);

  const cron = buildCron();

  return (
    <Card className="p-4 space-y-4">
      {/* Frequency Selector */}
      <div>
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Minutes */}
      {frequency === "minutes" && (
        <div className="space-y-2">
          <Label>Run every {minuteStep} minutes</Label>
          <Slider
            min={1}
            max={59}
            value={[minuteStep]}
            onValueChange={(v) => setMinuteStep(v[0])}
          />
        </div>
      )}

      {/* Hours */}
      {frequency === "hours" && (
        <div className="space-y-2">
          <Label>Run every {hourStep} hours</Label>
          <Slider
            min={1}
            max={23}
            value={[hourStep]}
            onValueChange={(v) => setHourStep(v[0])}
          />
        </div>
      )}

      {/* Daily */}
      {frequency === "daily" && (
        <div className="flex flex-col gap-2">
          <Label>Select time</Label>
          <Input
            type="time"
            className="w-40"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
          />
        </div>
      )}

      {/* Weekly */}
      {frequency === "weekly" && (
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Day of week</Label>
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label>Time</Label>
            <Input
              type="time"
              className="mt-1 w-32"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Monthly */}
      {frequency === "monthly" && (
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Day of month</Label>
            <Input
              type="number"
              min={1}
              max={31}
              className="mt-1"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
            />
          </div>

          <div className="flex-1">
            <Label>Time</Label>
            <Input
              type="time"
              className="mt-1"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Custom */}
      {frequency === "custom" && (
        <div className="space-y-2">
          <Label>Enter a cron expression</Label>
          <Input
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="*/5 * * * *"
          />
        </div>
      )}

      {/* Preview */}
      <div className="pt-2 space-y-1">
        <div className="text-sm text-muted-foreground">Generated cron</div>
        <Badge variant="outline" className="text-base py-1">
          {cron}
        </Badge>

        <div className="text-sm text-muted-foreground">Human</div>
        <Badge>{cronstrue.toString(cron)}</Badge>
      </div>
    </Card>
  );
}
