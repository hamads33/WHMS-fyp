// ============================================================================
// FILE: components/backup-health-status.jsx
// PURPOSE: System health monitoring component
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { backupApi } from "@/lib/api/backupClient";
import {
  Database,
  HardDrive,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

export function BackupHealthStatus() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await backupApi("/stats/health");
        setHealth(res.data);
      } catch (err) {
        console.error("Failed to load health:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  const overallStatus = health.status;
  const StatusIcon =
    overallStatus === "healthy"
      ? CheckCircle2
      : overallStatus === "degraded"
      ? AlertTriangle
      : XCircle;

  const statusColor =
    overallStatus === "healthy"
      ? "text-green-600 bg-green-100 dark:bg-green-900/20"
      : overallStatus === "degraded"
      ? "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20"
      : "text-red-600 bg-red-100 dark:bg-red-900/20";

  const checks = [
    {
      name: "Database",
      status: health.checks.database.status,
      icon: Database,
    },
    {
      name: "Storage",
      status: health.checks.storage.status,
      icon: HardDrive,
    },
    {
      name: "Queue",
      status: health.checks.queue.status,
      icon: Activity,
      details: `${health.checks.queue.activeJobs} active, ${health.checks.queue.pendingJobs} pending`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>System Health</CardTitle>
          <Badge className={statusColor}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {overallStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {checks.map((check) => {
          const CheckIcon = check.icon;
          const isUp = check.status === "up" || check.status === "healthy";
          const checkColor = isUp
            ? "text-green-600"
            : "text-red-600";

          return (
            <div
              key={check.name}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isUp
                      ? "bg-green-100 dark:bg-green-900/20"
                      : "bg-red-100 dark:bg-red-900/20"
                  }`}
                >
                  <CheckIcon className={`h-4 w-4 ${checkColor}`} />
                </div>
                <div>
                  <div className="font-medium">{check.name}</div>
                  {check.details && (
                    <div className="text-xs text-muted-foreground">
                      {check.details}
                    </div>
                  )}
                </div>
              </div>
              <Badge
                variant={isUp ? "default" : "destructive"}
                className="capitalize"
              >
                {check.status}
              </Badge>
            </div>
          );
        })}

        {health.metrics && (
          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Running Backups</span>
              <span className="font-medium">{health.metrics.runningBackups}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}