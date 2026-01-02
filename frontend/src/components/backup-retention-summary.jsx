// ============================================================================
// FILE: components/backup-retention-summary.jsx
// PURPOSE: Retention policy overview and expiring backups
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { backupApi } from "@/lib/api/backupClient";
import { formatBytes } from "@/lib/utils";
import { Clock, AlertTriangle, Trash2, Archive } from "lucide-react";

export function BackupRetentionSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await backupApi("/retention/summary");
        setSummary(res.data);
      } catch (err) {
        console.error("Failed to load retention summary:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const stats = [
    {
      label: "Total Backups",
      value: summary.totalBackups,
      icon: Archive,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      label: "Expiring (7 days)",
      value: summary.expiringWithin7Days,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    {
      label: "Expiring (30 days)",
      value: summary.expiringWithin30Days,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      label: "Expired",
      value: summary.expired,
      icon: Trash2,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Policy</CardTitle>
        <CardDescription>
          Total storage: {formatBytes(summary.totalRetainedSizeBytes)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming Expirations */}
        {summary.upcomingExpirations &&
          summary.upcomingExpirations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Upcoming Expirations</h4>
              <div className="space-y-2">
                {summary.upcomingExpirations.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/50"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate">
                        {backup.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expires: {new Date(backup.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {backup.daysUntilExpiry}d left
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Warning */}
        {summary.expired > 0 && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {summary.expired} backup(s) have expired and will be deleted
                automatically
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}