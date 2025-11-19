"use client";

import React, { useEffect, useState } from "react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

import CronModeCards from "./CronModeCards";
import CronEverySeconds from "./CronEverySeconds";
import CronEveryMinutes from "./CronEveryMinutes";
import CronEveryHours from "./CronEveryHours";
import CronDaily from "./CronDaily";
import CronWeekly from "./CronWeekly";
import CronMonthly from "./CronMonthly";
import CronAdvanced from "./CronAdvanced";
import CronPreview from "./CronPreview";

import { buildCron, validateCron } from "../utils/cron-api";
import { CronMode, CronPayload } from "../types/cron-types";

export default function CronBuilder({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [tab, setTab] = useState<"simple" | "advanced">("simple");
  const [mode, setMode] = useState<CronMode>("everyMinutes");

  const [loading, setLoading] = useState(false);

  const [cron, setCron] = useState(value || "");
  const [pretty, setPretty] = useState("");
  const [intervalSec, setIntervalSec] = useState<number | null>(null);
  const [nextRuns, setNextRuns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Live validate cron expression
   * Backend only returns:
   *   ok, valid, cron, approxIntervalSec
   */
  async function refreshPreview(exp: string) {
    if (!exp) return;

    try {
      const data = await validateCron(exp);

      if (!data.ok || !data.valid) {
        setError(data.errors?.[0] || "Invalid cron expression");
        setPretty("");
        setIntervalSec(null);
        setNextRuns([]);
        return;
      }

      // VALID cron expression
      setError(null);
      setPretty("Valid cron expression"); // backend does not return pretty text
      setIntervalSec(data.approxIntervalSec ?? null);
      setNextRuns([]); // backend validate does not return nextRuns
    } catch {
      setError("Failed to validate cron");
      setPretty("");
      setIntervalSec(null);
      setNextRuns([]);
    }
  }

  useEffect(() => {
    refreshPreview(cron);
  }, [cron]);

  /**
   * Build cron expression from UI mode
   * Backend cron/build returns:
   *   ok, cron, pretty, approxIntervalSec
   */
 async function apply(payload: CronPayload) {
  setLoading(true);

  try {
    const res = await buildCron(payload);

    if (!res.ok) {
      setError(res.error || "Invalid selection");
      return;
    }

    // Safety: cron is always expected when ok = true
    if (res.cron) {
      setCron(res.cron);
      onChange(res.cron);
    }

    setPretty(res.pretty ?? "");
    setIntervalSec(res.approxIntervalSec ?? null);
    setError(null);

    // backend does not return nextRuns for build
    setNextRuns([]);
  } finally {
    setLoading(false);
  }
}

  function renderModeUI() {
    switch (mode) {
      case "everySeconds":
        return (
          <CronEverySeconds
            onApply={(v) => apply({ type: "everySeconds", value: v })}
          />
        );

      case "everyMinutes":
        return (
          <CronEveryMinutes
            onApply={(v) => apply({ type: "everyMinutes", value: v })}
          />
        );

      case "everyHours":
        return (
          <CronEveryHours
            onApply={(d) =>
              apply({ type: "everyHours", value: d.value, minute: d.minute })
            }
          />
        );

      case "daily":
        return (
          <CronDaily
            onApply={(d) => apply({ type: "daily", hour: d.hour, minute: d.minute })}
          />
        );

      case "weekly":
        return (
          <CronWeekly
            onApply={(d) =>
              apply({
                type: "weekly",
                dayOfWeek: d.dayOfWeek,
                hour: d.hour,
                minute: d.minute,
              })
            }
          />
        );

      case "monthly":
        return (
          <CronMonthly
            onApply={(d) =>
              apply({
                type: "monthly",
                day: d.day,
                hour: d.hour,
                minute: d.minute,
              })
            }
          />
        );
    }
  }

  return (
    <div className="space-y-6 p-6 border rounded-xl bg-white shadow-sm">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">Simple</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* SIMPLE MODE */}
        <TabsContent value="simple" className="space-y-6 pt-4">
          <CronModeCards selected={mode} onSelect={(m) => setMode(m as CronMode)} />

          <Separator />

          <div className="pt-2 relative">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
              </div>
            ) : (
              renderModeUI()
            )}
          </div>
        </TabsContent>

        {/* ADVANCED MODE */}
        <TabsContent value="advanced" className="pt-4 space-y-4">
          <CronAdvanced
            expression={cron}
            onChange={(v) => {
              setCron(v);
              onChange(v);
            }}
          />
        </TabsContent>
      </Tabs>

      <CronPreview
        cron={cron}
        pretty={pretty}
        interval={intervalSec}
        nextRuns={nextRuns}
        error={error}
      />
    </div>
  );
}
