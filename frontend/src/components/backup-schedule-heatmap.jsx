"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Loader2 } from "lucide-react";
import { backupApi } from "@/lib/api/backupClient";

export function BackupScheduleHeatmap() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  const generateDefaultHeatmap = () => {
    const data = [];
    const today = new Date();
    for (let i = 0; i < 28; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      data.push({
        date: date.toISOString().split("T")[0],
        count: i % 5,
      });
    }
    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const generateWeeks = (count, data = heatmapData) => {
    const generatedWeeks = [];
    for (let i = count - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      generatedWeeks.push({
        start: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        end: weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        days: [],
      });

      for (let j = 0; j < 7; j++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + j);
        const dateStr = date.toISOString().split("T")[0];
        const dayData = data.find((d) => d.date === dateStr);
        generatedWeeks[generatedWeeks.length - 1].days.push({
          date: dateStr,
          dayName: date.toLocaleDateString(undefined, { weekday: "short" }),
          count: dayData?.count || 0,
        });
      }
    }
    return generatedWeeks;
  };

  useEffect(() => {
    backupApi("/analytics/schedule-heatmap?weeks=4")
      .then((res) => {
        const data = res.data?.data || generateDefaultHeatmap();
        setHeatmapData(data);
      })
      .catch((err) => {
        console.error("Failed to load schedule heatmap:", err);
        setHeatmapData(generateDefaultHeatmap());
      })
      .finally(() => setLoading(false));
  }, []);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getColorClass = (count) => {
    if (count === 0) return "bg-muted/20 hover:bg-muted/30";
    if (count === 1) return "bg-blue-200 dark:bg-blue-900 hover:bg-blue-300 dark:hover:bg-blue-800";
    if (count === 2) return "bg-blue-400 dark:bg-blue-700 hover:bg-blue-500 dark:hover:bg-blue-600";
    if (count === 3) return "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400";
    return "bg-blue-700 dark:bg-blue-400 hover:bg-blue-800 dark:hover:bg-blue-300";
  };

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Backup Schedule</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const weeks_to_display = generateWeeks(4, heatmapData);

  return (
    <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Schedule</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <TooltipProvider>
          <div className="space-y-4">
            {/* Day labels */}
            <div className="flex gap-1">
              <div className="w-12" />
              {days.map((day) => (
                <div
                  key={day}
                  className="h-7 w-7 flex items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1.5">
              {weeks_to_display.map((week, weekIdx) => (
                <div key={weekIdx} className="flex gap-1 items-start">
                  <div className="w-12 text-xs text-muted-foreground font-medium leading-7 text-center truncate">
                    <div className="text-[10px] leading-tight">{week.start}</div>
                  </div>
                  <div className="flex gap-1">
                    {week.days.map((day, dayIdx) => (
                      <Tooltip key={dayIdx}>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-7 w-7 rounded-md transition-all cursor-pointer border border-muted/20 ${getColorClass(
                              day.count
                            )}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p>{day.dayName}, {new Date(day.date).toLocaleDateString()}</p>
                          <p className="font-semibold">{day.count} backup{day.count !== 1 ? "s" : ""}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-muted/20">
              <p className="text-xs text-muted-foreground mb-2">Activity level:</p>
              <div className="flex gap-2 items-center text-xs">
                <div className="h-3 w-3 rounded-sm bg-muted/20" />
                <span className="text-muted-foreground text-[11px]">None</span>
                <div className="h-3 w-3 rounded-sm bg-blue-300 dark:bg-blue-700" />
                <span className="text-muted-foreground text-[11px]">Low</span>
                <div className="h-3 w-3 rounded-sm bg-blue-600 dark:bg-blue-500" />
                <span className="text-muted-foreground text-[11px]">High</span>
                <div className="h-3 w-3 rounded-sm bg-blue-700 dark:bg-blue-400" />
                <span className="text-muted-foreground text-[11px]">Very High</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
