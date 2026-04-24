"use client";

import { useEffect, useState } from "react";
import { backupApi } from "@/lib/api/backupClient";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getIntensityClass(count) {
  if (count === 0) return "bg-muted/30";
  if (count === 1) return "bg-foreground/20";
  if (count <= 3) return "bg-foreground/40";
  if (count <= 6) return "bg-foreground/65";
  return "bg-foreground/90";
}

function buildGrid(rawData, weeks = 8) {
  const dayMap = {};
  rawData.forEach((d) => { dayMap[d.date] = d; });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDay = new Date(today);
  startDay.setDate(today.getDate() - (weeks * 7 - 1));

  const cols = [];
  let currentWeek = [];

  for (let d = new Date(startDay); d <= today; d.setDate(d.getDate() + 1)) {
    const key        = d.toISOString().split("T")[0];
    const dayOfWeek  = d.getDay();

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      cols.push(currentWeek);
      currentWeek = [];
    }

    currentWeek.push({
      date:       key,
      dayOfWeek,
      count:      dayMap[key]?.count      || 0,
      successful: dayMap[key]?.successful || 0,
      failed:     dayMap[key]?.failed     || 0,
      label:      new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  if (currentWeek.length > 0) cols.push(currentWeek);
  return cols;
}

export function BackupScheduleHeatmap() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const WEEKS = 8;

  useEffect(() => {
    backupApi(`/analytics/schedule-heatmap?weeks=${WEEKS}`)
      .then((r) => setRawData(r.data || []))
      .catch(() => setRawData([]))
      .finally(() => setLoading(false));
  }, []);

  const grid           = buildGrid(rawData, WEEKS);
  const totalActivity  = rawData.reduce((s, d) => s + d.count, 0);
  const activeDays     = rawData.filter((d) => d.count > 0).length;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary border border-border">
              <Calendar className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Schedule Activity</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Last {WEEKS} weeks heatmap</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{totalActivity}</p>
            <p className="text-[10px] text-muted-foreground">total backups</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 bg-muted/30 rounded-xl animate-pulse" />
        ) : (
          <>
            {/* Day labels */}
            <div className="flex gap-1">
              <div className="w-7 shrink-0" />
              <div className="flex-1 grid grid-cols-7 gap-0.5">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {d[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 flex flex-col gap-0.5">
              {grid.map((week, wi) => {
                const weekLabel = week[0]?.label?.split(" ").slice(0, 2).join(" ");
                const padded    = [...Array(7)].map((_, di) => week.find(d => d.dayOfWeek === di) || null);
                return (
                  <div key={wi} className="flex items-center gap-1">
                    <div className="w-7 text-[9px] text-muted-foreground shrink-0 text-right pr-1">
                      {wi % 2 === 0 ? weekLabel : ""}
                    </div>
                    <div className="flex-1 grid grid-cols-7 gap-0.5">
                      {padded.map((day, di) => (
                        <div
                          key={di}
                          className={cn(
                            "aspect-square rounded-sm transition-all",
                            day ? getIntensityClass(day.count) : "bg-transparent",
                            day?.count > 0 && "hover:ring-1 hover:ring-foreground/30 hover:scale-110 cursor-default"
                          )}
                          title={day ? `${day.label}: ${day.count} backups (${day.successful} ok, ${day.failed} failed)` : ""}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{activeDays} active days</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Less</span>
                {["bg-muted/30", "bg-foreground/20", "bg-foreground/40", "bg-foreground/65", "bg-foreground/90"].map((c, i) => (
                  <div key={i} className={cn("h-2.5 w-2.5 rounded-sm", c)} />
                ))}
                <span className="text-[10px] text-muted-foreground">More</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
