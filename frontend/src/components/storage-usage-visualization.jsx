"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive, Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { backupApi } from "@/lib/api/backupClient";

export function StorageUsageVisualization() {
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backupApi("/stats/storage")
      .then((res) => {
        setStorage(res.data);
      })
      .catch((err) => {
        console.error("Failed to load storage data:", err);
        setStorage(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Storage Usage</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!storage) {
    return (
      <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Storage Usage</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No storage data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalUsed = storage.database + storage.files + storage.snapshots + storage.logs;
  const quota = storage.quota || totalUsed * 1.2;
  const percentUsed = (totalUsed / quota) * 100;

  const usagePercent = {
    database: (storage.database / totalUsed) * 100,
    files: (storage.files / totalUsed) * 100,
    snapshots: (storage.snapshots / totalUsed) * 100,
    logs: (storage.logs / totalUsed) * 100,
  };

  const colors = {
    database: "bg-blue-500",
    files: "bg-blue-400",
    snapshots: "bg-blue-300",
    logs: "bg-blue-200",
  };

  const entries = [
    { key: "database", label: "Database Backups", value: storage.database },
    { key: "files", label: "File Backups", value: storage.files },
    { key: "snapshots", label: "Snapshots", value: storage.snapshots },
    { key: "logs", label: "Logs", value: storage.logs },
  ];

  return (
    <Card className="rounded-2xl shadow-sm border border-muted/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Storage Usage</CardTitle>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {formatBytes(totalUsed)} / {formatBytes(quota)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 flex flex-col">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Total Usage</span>
            <span className="font-semibold text-foreground">{Math.round(percentUsed)}%</span>
          </div>

          {/* Stacked bar visualization */}
          <div className="flex h-6 rounded-full overflow-hidden bg-muted/30 border border-muted/20">
            {entries.map((entry) => (
              usagePercent[entry.key] > 0 && (
                <div
                  key={entry.key}
                  className={`${colors[entry.key]} transition-all opacity-90`}
                  style={{ width: `${usagePercent[entry.key]}%` }}
                  title={`${entry.label}: ${formatBytes(entry.value)}`}
                />
              )
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
          {entries.map((entry) => (
            <div key={entry.key} className="flex items-start gap-2">
              <div className={`h-2.5 w-2.5 rounded-sm shrink-0 mt-0.5 ${colors[entry.key]}`} />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{entry.label}</p>
                <p className="text-muted-foreground text-xs">
                  {formatBytes(entry.value)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Status message */}
        {percentUsed > 80 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded-md border border-amber-200 dark:border-amber-800">
            Storage usage is high. Consider implementing retention policies.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
